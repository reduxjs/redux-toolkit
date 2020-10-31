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
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          const substate = ((draft[arg.endpoint] ??= {})[arg.serializedQueryArgs] ??= {
            status: QueryStatus.pending,
            arg: arg.internalQueryArgs,
            subscribers: [],
          });
          substate.subscribers.push(requestId);
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
              substate.subscribers.push(action.meta.requestId);
            } else {
              substate.status = QueryStatus.rejected;
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
            arg: arg.internalQueryArgs,
          };
        })
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta: { requestId, arg } }) => {
          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            substate.status = QueryStatus.fulfilled;
            substate.data = payload;
          });
        })
        .addCase(mutationThunk.rejected, (draft, { meta: { requestId, arg } }) => {
          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            substate.status = QueryStatus.rejected;
          });
        });
    },
  });

  const invalidationSlice = createSlice({
    name: `${reducerPath}/invalidation`,
    initialState: {} as InvalidationState<string>,
    reducers: {},
    extraReducers(builder) {
      builder.addCase(queryThunk.fulfilled, (state, { payload, meta: { arg } }) => {
        const { endpoint, serializedQueryArgs } = arg;
        const providedEntities = calculateProvidedBy(definitions[endpoint].provides || [], payload);
        for (const { type, id } of providedEntities) {
          const subscribedQueries = ((state[type] ??= {})[id || '*'] ??= []);
          const alreadySubscribed = subscribedQueries.some(
            (q) => q.endpoint === endpoint && q.serializedQueryArgs === serializedQueryArgs
          );
          if (!alreadySubscribed) {
            subscribedQueries.push({ endpoint, serializedQueryArgs });
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
    unsubscribeQueryResult: querySlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
  };

  return { reducer, actions };
}

export type UnsubscribeQueryResult = ReturnType<typeof buildSlice>['actions']['unsubscribeQueryResult'];
export type UnsubscribeMutationResult = ReturnType<typeof buildSlice>['actions']['unsubscribeMutationResult'];
