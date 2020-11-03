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
} from './apiState';
import type { MutationThunkArg, QueryThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions } from './endpointDefinitions';

export type InternalState = CombinedState<any, string>;

function updateQuerySubstateIfExists(
  state: QueryState<any>,
  { endpoint, serializedQueryArgs }: QuerySubstateIdentifier,
  update: (substate: QuerySubState<any>) => void
) {
  const substate = (state[endpoint] ??= {})[serializedQueryArgs];
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
      unsubscribeResult(
        draft,
        {
          payload: { endpoint, serializedQueryArgs, requestId },
        }: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>
      ) {
        const substate = draft[endpoint]?.[serializedQueryArgs];
        if (!substate) return;
        const index = substate.subscribers.indexOf(requestId);
        if (index >= 0) {
          substate.subscribers.splice(index, 1);
        }
      },
      removeQueryResult(draft, { payload: { endpoint, serializedQueryArgs } }: PayloadAction<QuerySubstateIdentifier>) {
        const endpointSubstate = draft[endpoint];
        if (endpointSubstate && (endpointSubstate?.[serializedQueryArgs]?.subscribers.length ?? 0) === 0) {
          delete endpointSubstate[serializedQueryArgs];
        }
      },
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            const substate = ((draft[arg.endpoint] ??= {})[arg.serializedQueryArgs] ??= {
              status: QueryStatus.pending,
              arg: arg.arg,
              subscribers: [],
            });
            substate.subscribers.push(requestId);
          } else {
            updateQuerySubstateIfExists(draft, arg, (substate) => {
              substate.status = QueryStatus.pending;
            });
          }
        })
        .addCase(queryThunk.fulfilled, (draft, action) => {
          updateQuerySubstateIfExists(draft, action.meta.arg, (substate) => {
            substate.status = QueryStatus.fulfilled;
            substate.data = action.payload;
          });
        })
        .addCase(queryThunk.rejected, (draft, action) => {
          updateQuerySubstateIfExists(draft, action.meta.arg, (substate) => {
            if (action.meta.condition) {
              // request was aborted due to condition - we still want to subscribe to the current value!
              if (action.meta.arg.subscribe) {
                substate.subscribers.push(action.meta.requestId);
              }
            } else {
              substate.status = QueryStatus.rejected;
              substate.error = action.payload ?? action.error;
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
          (draft[arg.endpoint] ??= {})[requestId] = {
            status: QueryStatus.pending,
            arg: arg.arg,
          };
        })
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta: { requestId, arg } }) => {
          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            substate.status = QueryStatus.fulfilled;
            substate.data = payload;
          });
        })
        .addCase(mutationThunk.rejected, (draft, { payload, error, meta: { requestId, arg } }) => {
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
          const { endpoint, serializedQueryArgs } = arg;
          const providedEntities = calculateProvidedBy(definitions[endpoint].provides, payload, arg.arg);
          for (const { type, id } of providedEntities) {
            const subscribedQueries = ((draft[type] ??= {})[id || '__internal_without_id'] ??= []);
            const alreadySubscribed = subscribedQueries.some(
              (q) => q.endpoint === endpoint && q.serializedQueryArgs === serializedQueryArgs
            );
            if (!alreadySubscribed) {
              subscribedQueries.push({ endpoint, serializedQueryArgs });
            }
          }
        })
        .addCase(querySlice.actions.removeQueryResult, (draft, { payload: { endpoint, serializedQueryArgs } }) => {
          for (const entityTypeSubscriptions of Object.values(draft)) {
            for (const idSubscriptions of Object.values(entityTypeSubscriptions)) {
              const foundAt = idSubscriptions.findIndex(
                (q) => q.endpoint === endpoint && q.serializedQueryArgs === serializedQueryArgs
              );
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
    removeQueryResult: querySlice.actions.removeQueryResult,
    unsubscribeQueryResult: querySlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
  };

  return { reducer, actions };
}

export type InvalidateQueryResult = ReturnType<typeof buildSlice>['actions']['removeQueryResult'];
export type UnsubscribeQueryResult = ReturnType<typeof buildSlice>['actions']['unsubscribeQueryResult'];
export type UnsubscribeMutationResult = ReturnType<typeof buildSlice>['actions']['unsubscribeMutationResult'];
