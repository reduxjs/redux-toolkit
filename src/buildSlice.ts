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
} from './apiState';
import type { MutationThunkArg, QueryThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions } from './endpointDefinitions';

export type InternalState = CombinedState<any, string>;

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
  { endpoint, requestId }: MutationSubstateIdentifier,
  update: (substate: MutationSubState<any>) => void
) {
  const substate = (state[endpoint] ??= {})[requestId];
  if (substate) {
    update(substate);
  }
}

export function buildSlice({
  reducerPath,
  queryThunk,
  mutationThunk,
  endpointDefinitions: definitions,
}: {
  reducerPath: string;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  endpointDefinitions: EndpointDefinitions;
}) {
  const querySlice = createSlice({
    name: `${reducerPath}/queries`,
    initialState: {} as QueryState<any>,
    reducers: {
      updateSubscriptionOptions(
        draft,
        {
          payload: { queryCacheKey, requestId, options },
        }: PayloadAction<
          { endpoint: string; requestId: string; options: Subscribers[number] } & QuerySubstateIdentifier
        >
      ) {
        updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
          // don't accidentally add a subscription, just update
          if (substate.subscribers[requestId]) {
            substate.subscribers[requestId] = options;
          }
        });
      },
      unsubscribeResult(
        draft,
        { payload: { queryCacheKey, requestId } }: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>
      ) {
        updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
          delete substate.subscribers[requestId];
        });
      },
      removeQueryResult(draft, { payload: { queryCacheKey } }: PayloadAction<QuerySubstateIdentifier>) {
        if ((draft[queryCacheKey]?.subscribers.length ?? 0) === 0) {
          delete draft[queryCacheKey];
        }
      },
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            // only initialize substate if we want to subscribe to it
            draft[arg.queryCacheKey] ??= {
              status: QueryStatus.uninitialized,
              subscribers: {},
              endpoint: arg.endpoint,
            };
          }

          updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
            substate.status = QueryStatus.pending;
            substate.requestId = requestId;
            substate.internalQueryArgs = arg.internalQueryArgs;
            if (arg.subscribe) {
              substate.subscribers[requestId] = arg.subscriptionOptions ?? substate.subscribers[requestId] ?? {};
            }
          });
        })
        .addCase(queryThunk.fulfilled, (draft, { meta, payload }) => {
          updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, (substate) => {
            if (substate.requestId !== meta.requestId) return;
            substate.status = QueryStatus.fulfilled;
            substate.data = payload;
          });
        })
        .addCase(queryThunk.rejected, (draft, { meta: { condition, arg, requestId }, error, payload }) => {
          updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
            if (condition) {
              // request was aborted due to condition (another query already running) - we still want to subscribe to the current value!
              if (arg.subscribe) {
                substate.subscribers[requestId] = arg.subscriptionOptions ?? substate.subscribers[requestId] ?? {};
              }
            } else {
              // request failed
              if (substate.requestId !== requestId) return;
              substate.status = QueryStatus.rejected;
              substate.error = payload ?? error;
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
        const endpointState = draft[action.payload.endpoint];
        if (endpointState && action.payload.requestId in endpointState) {
          delete endpointState[action.payload.requestId];
        }
      },
    },
    extraReducers(builder) {
      builder
        .addCase(mutationThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (!arg.track) return;

          (draft[arg.endpoint] ??= {})[requestId] = {
            status: QueryStatus.pending,
            arg: arg.arg,
          };
        })
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta: { requestId, arg } }) => {
          if (!arg.track) return;

          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            substate.status = QueryStatus.fulfilled;
            substate.data = payload;
          });
        })
        .addCase(mutationThunk.rejected, (draft, { payload, error, meta: { requestId, arg } }) => {
          if (!arg.track) return;

          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            substate.status = QueryStatus.rejected;
            substate.error = payload ?? error;
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
          const providedEntities = calculateProvidedBy(definitions[endpoint].provides, payload, arg.internalQueryArgs);
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

  const reducer = combineReducers<InternalState>({
    queries: querySlice.reducer,
    mutations: mutationSlice.reducer,
    provided: invalidationSlice.reducer,
  });

  const actions = {
    updateSubscriptionOptions: querySlice.actions.updateSubscriptionOptions,
    removeQueryResult: querySlice.actions.removeQueryResult,
    unsubscribeQueryResult: querySlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
  };

  return { reducer, actions };
}
export type SliceActions = ReturnType<typeof buildSlice>['actions'];
