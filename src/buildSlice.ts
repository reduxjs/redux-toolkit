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
      removeQueryResult(draft, { payload: { queryCacheKey } }: PayloadAction<QuerySubstateIdentifier>) {
        delete draft[queryCacheKey];
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
              // request was aborted due to condition (another query already running)
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

  const reducer = combineReducers<InternalState>({
    queries: querySlice.reducer,
    mutations: mutationSlice.reducer,
    provided: invalidationSlice.reducer,
    subscriptions: subscriptionSlice.reducer,
  });

  const actions = {
    updateSubscriptionOptions: subscriptionSlice.actions.updateSubscriptionOptions,
    removeQueryResult: querySlice.actions.removeQueryResult,
    unsubscribeQueryResult: subscriptionSlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
  };

  return { reducer, actions };
}
export type SliceActions = ReturnType<typeof buildSlice>['actions'];
