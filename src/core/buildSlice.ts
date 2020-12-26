import { AsyncThunk, combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  CombinedState,
  QuerySubstateIdentifier,
  QuerySubState,
  MutationSubstateIdentifier,
  MutationSubState,
  QueryStatus,
  MutationState,
  QueryState,
  InvalidationState,
  Subscribers,
  QueryCacheKey,
  SubscriptionState,
  ConfigState,
} from './apiState';
import type { MutationThunkArg, QueryThunkArg, ThunkResult } from './buildThunks';
import { AssertEntityTypes, calculateProvidedBy, EndpointDefinitions } from '../endpointDefinitions';
import { applyPatches, Patch } from 'immer';
import { onFocus, onFocusLost, onOffline, onOnline } from './setupListeners';
import { isDocumentVisible, isOnline, copyWithStructuralSharing } from '../utils';
import { ApiContext } from '../apiTypes';

function updateQuerySubstateIfExists(
  state: QueryState<any>,
  queryCacheKey: QueryCacheKey,
  update: (substate: QuerySubState<any>) => void
) {
  const substate = state[queryCacheKey];
  if (substate) {
    update(substate);
  }
}

function updateMutationSubstateIfExists(
  state: MutationState<any>,
  { requestId }: MutationSubstateIdentifier,
  update: (substate: MutationSubState<any>) => void
) {
  const substate = state[requestId];
  if (substate) {
    update(substate);
  }
}

export function buildSlice({
  reducerPath,
  queryThunk,
  mutationThunk,
  context: { endpointDefinitions: definitions },
  assertEntityType,
  config,
}: {
  reducerPath: string;
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<ThunkResult, MutationThunkArg<any>, {}>;
  context: ApiContext<EndpointDefinitions>;
  assertEntityType: AssertEntityTypes;
  config: Omit<ConfigState<string>, 'online' | 'focused'>;
}) {
  const querySlice = createSlice({
    name: `${reducerPath}/queries`,
    initialState: {} as QueryState<any>,
    reducers: {
      removeQueryResult(draft, { payload: { queryCacheKey } }: PayloadAction<QuerySubstateIdentifier>) {
        delete draft[queryCacheKey];
      },
      queryResultPatched(
        draft,
        { payload: { queryCacheKey, patches } }: PayloadAction<QuerySubstateIdentifier & { patches: Patch[] }>
      ) {
        updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
          substate.data = applyPatches(substate.data as any, patches);
        });
      },
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            // only initialize substate if we want to subscribe to it
            draft[arg.queryCacheKey] ??= {
              status: QueryStatus.uninitialized,
              endpoint: arg.endpoint,
            };
          }

          updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
            substate.status = QueryStatus.pending;
            substate.requestId = requestId;
            substate.internalQueryArgs = arg.internalQueryArgs;
            substate.originalArgs = arg.originalArgs;
            substate.startedTimeStamp = arg.startedTimeStamp;
          });
        })
        .addCase(queryThunk.fulfilled, (draft, { meta, payload }) => {
          updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, (substate) => {
            if (substate.requestId !== meta.requestId) return;
            substate.status = QueryStatus.fulfilled;
            substate.data = copyWithStructuralSharing(substate.data, payload.result);
            substate.error = undefined;
            substate.fulfilledTimeStamp = payload.fulfilledTimeStamp;
          });
        })
        .addCase(queryThunk.rejected, (draft, { meta: { condition, arg, requestId }, error, payload }) => {
          updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
            if (condition) {
              // request was aborted due to condition (another query already running)
            } else {
              // request failed
              if (substate.requestId !== requestId) return;
              substate.status = QueryStatus.rejected;
              substate.error = (payload ?? error) as any;
            }
          });
        });
    },
  });
  const mutationSlice = createSlice({
    name: `${reducerPath}/mutations`,
    initialState: {} as MutationState<any>,
    reducers: {
      unsubscribeResult(draft, action: PayloadAction<MutationSubstateIdentifier>) {
        if (action.payload.requestId in draft) {
          delete draft[action.payload.requestId];
        }
      },
    },
    extraReducers(builder) {
      builder
        .addCase(mutationThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (!arg.track) return;

          draft[requestId] = {
            status: QueryStatus.pending,
            internalQueryArgs: arg.internalQueryArgs,
            originalArgs: arg.originalArgs,
            endpoint: arg.endpoint,
            startedTimeStamp: arg.startedTimeStamp,
          };
        })
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta: { requestId, arg } }) => {
          if (!arg.track) return;

          updateMutationSubstateIfExists(draft, { requestId }, (substate) => {
            substate.status = QueryStatus.fulfilled;
            substate.data = payload.result;
            substate.fulfilledTimeStamp = payload.fulfilledTimeStamp;
          });
        })
        .addCase(mutationThunk.rejected, (draft, { payload, error, meta: { requestId, arg } }) => {
          if (!arg.track) return;

          updateMutationSubstateIfExists(draft, { requestId }, (substate) => {
            substate.status = QueryStatus.rejected;
            substate.error = (payload ?? error) as any;
          });
        });
    },
  });

  const invalidationSlice = createSlice({
    name: `${reducerPath}/invalidation`,
    initialState: {} as InvalidationState<string>,
    reducers: {},
    extraReducers(builder) {
      builder
        .addCase(queryThunk.fulfilled, (draft, { payload, meta: { arg } }) => {
          const { endpoint, queryCacheKey } = arg;
          const providedEntities = calculateProvidedBy(
            definitions[endpoint].provides,
            payload.result,
            arg.originalArgs,
            assertEntityType
          );
          for (const { type, id } of providedEntities) {
            const subscribedQueries = ((draft[type] ??= {})[id || '__internal_without_id'] ??= []);
            const alreadySubscribed = subscribedQueries.includes(queryCacheKey);
            if (!alreadySubscribed) {
              subscribedQueries.push(queryCacheKey);
            }
          }
        })
        .addCase(querySlice.actions.removeQueryResult, (draft, { payload: { queryCacheKey } }) => {
          for (const entityTypeSubscriptions of Object.values(draft)) {
            for (const idSubscriptions of Object.values(entityTypeSubscriptions)) {
              const foundAt = idSubscriptions.indexOf(queryCacheKey);
              if (foundAt !== -1) {
                idSubscriptions.splice(foundAt, 1);
              }
            }
          }
        });
    },
  });

  const subscriptionSlice = createSlice({
    name: `${reducerPath}/subscriptions`,
    initialState: {} as SubscriptionState,
    reducers: {
      updateSubscriptionOptions(
        draft,
        {
          payload: { queryCacheKey, requestId, options },
        }: PayloadAction<
          { endpoint: string; requestId: string; options: Subscribers[number] } & QuerySubstateIdentifier
        >
      ) {
        if (draft?.[queryCacheKey]?.[requestId]) {
          draft[queryCacheKey]![requestId] = options;
        }
      },
      unsubscribeResult(
        draft,
        { payload: { queryCacheKey, requestId } }: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>
      ) {
        if (draft[queryCacheKey]) {
          delete draft[queryCacheKey]![requestId];
        }
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(querySlice.actions.removeQueryResult, (draft, { payload: { queryCacheKey } }) => {
          delete draft[queryCacheKey];
        })
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            const substate = (draft[arg.queryCacheKey] ??= {});
            substate[requestId] = arg.subscriptionOptions ?? substate[requestId] ?? {};
          }
        })
        .addCase(queryThunk.rejected, (draft, { meta: { condition, arg, requestId }, error, payload }) => {
          const substate = draft[arg.queryCacheKey];
          // request was aborted due to condition (another query already running)
          if (condition && arg.subscribe && substate) {
            substate[requestId] = arg.subscriptionOptions ?? substate[requestId] ?? {};
          }
        });
    },
  });

  const configSlice = createSlice({
    name: `${reducerPath}/config`,
    initialState: {
      online: isOnline(),
      focused: isDocumentVisible(),
      ...config,
    } as ConfigState<string>,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(onOnline, (state) => {
          state.online = true;
        })
        .addCase(onOffline, (state) => {
          state.online = false;
        })
        .addCase(onFocus, (state) => {
          state.focused = true;
        })
        .addCase(onFocusLost, (state) => {
          state.focused = false;
        });
    },
  });

  const reducer = combineReducers<CombinedState<any, string, string>>({
    queries: querySlice.reducer,
    mutations: mutationSlice.reducer,
    provided: invalidationSlice.reducer,
    subscriptions: subscriptionSlice.reducer,
    config: configSlice.reducer,
  });

  const actions = {
    updateSubscriptionOptions: subscriptionSlice.actions.updateSubscriptionOptions,
    queryResultPatched: querySlice.actions.queryResultPatched,
    removeQueryResult: querySlice.actions.removeQueryResult,
    unsubscribeQueryResult: subscriptionSlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
  };

  return { reducer, actions };
}
export type SliceActions = ReturnType<typeof buildSlice>['actions'];
