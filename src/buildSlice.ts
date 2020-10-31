import { AsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  QueryState,
  QuerySubstateIdentifier,
  QuerySubState,
  MutationSubstateIdentifier,
  MutationSubState,
  QueryStatus,
} from './apiState';
import type { MutationThunkArg, QueryThunkArg } from './buildThunks';

export type InternalState = QueryState<any>;

function updateQuerySubstateIfExists(
  state: InternalState,
  { endpoint, serializedQueryArgs }: QuerySubstateIdentifier,
  update: (substate: QuerySubState<any>) => void
) {
  const substate = (state.queries[endpoint] ??= {})[serializedQueryArgs];
  if (substate) {
    update(substate);
  }
}

function updateMutationSubstateIfExists(
  state: InternalState,
  { endpoint, requestId }: MutationSubstateIdentifier,
  update: (substate: MutationSubState<any>) => void
) {
  const substate = (state.mutations[endpoint] ??= {})[requestId];
  if (substate) {
    update(substate);
  }
}

const initialState = {
  queries: {},
  mutations: {},
} as InternalState;

export function buildSlice({
  reducerPath,
  queryThunk,
  mutationThunk,
}: {
  reducerPath: string;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
}) {
  const slice = createSlice({
    name: `${reducerPath}/state`,
    initialState: initialState,
    reducers: {
      unsubscribeQueryResult(
        draft,
        {
          payload: { endpoint, serializedQueryArgs, requestId },
        }: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>
      ) {
        const substate = draft.queries[endpoint]?.[serializedQueryArgs];
        if (!substate) return;
        const index = substate.subscribers.indexOf(requestId);
        if (index >= 0) {
          substate.subscribers.splice(index, 1);
        }
      },
      unsubscribeMutationResult(draft, action: PayloadAction<MutationSubstateIdentifier>) {
        const endpointState = draft.mutations[action.payload.endpoint];
        if (endpointState && action.payload.requestId in endpointState) {
          delete endpointState[action.payload.requestId];
        }
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          const substate = ((draft.queries[arg.endpoint] ??= {})[arg.serializedQueryArgs] ??= {
            status: QueryStatus.pending,
            arg: arg.internalQueryArgs,
            resultingEntities: [],
            subscribers: [],
          });
          substate.subscribers.push(requestId);
        })
        .addCase(queryThunk.fulfilled, (draft, action) => {
          updateQuerySubstateIfExists(draft, action.meta.arg, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.fulfilled,
              data: action.payload,
              resultingEntities: [
                /* TODO */
              ],
            });
          });
        })
        .addCase(queryThunk.rejected, (draft, action) => {
          updateQuerySubstateIfExists(draft, action.meta.arg, (substate) => {
            if (action.meta.condition) {
              // request was aborted due to condition - we still want to subscribe to the current value!
              substate.subscribers.push(action.meta.requestId);
            } else {
              Object.assign(substate, {
                status: QueryStatus.rejected,
              });
            }
          });
        })
        .addCase(mutationThunk.pending, (draft, { meta: { arg, requestId } }) => {
          (draft.mutations[arg.endpoint] ??= {})[requestId] = {
            status: QueryStatus.pending,
            arg: arg.internalQueryArgs,
          };
        })
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta: { requestId, arg } }) => {
          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.fulfilled,
              data: payload,
              resultingEntities: [
                /* TODO */
              ],
            });
          });
        })
        .addCase(mutationThunk.rejected, (draft, { meta: { requestId, arg } }) => {
          updateMutationSubstateIfExists(draft, { requestId, endpoint: arg.endpoint }, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.rejected,
            });
          });
        });
    },
  });

  return { slice };
}

export type UnsubscribeQueryResult = ReturnType<typeof buildSlice>['slice']['actions']['unsubscribeQueryResult'];
export type UnsubscribeMutationResult = ReturnType<typeof buildSlice>['slice']['actions']['unsubscribeMutationResult'];
