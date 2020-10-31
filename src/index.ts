import {
  PayloadAction,
  createSlice,
  createAsyncThunk,
  createNextState,
  Middleware,
  ThunkDispatch,
  AnyAction,
  Reducer,
  AsyncThunkAction,
  ThunkAction,
} from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector, batch } from 'react-redux';
import { useRef } from 'react';

const resultType = Symbol();

// type NoInfer<T> = [T][T extends any ? 0 : never];

interface BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  query(arg: QueryArg): InternalQueryArgs;
  [resultType]?: ResultType;
}

type EntityDescription<EntityType> = { type: EntityType; id?: number | string };
type ResultDescription<EntityTypes extends string, ResultType> = ReadonlyArray<
  | EntityDescription<EntityTypes>
  | ((result: ResultType) => EntityDescription<EntityTypes> | ReadonlyArray<EntityDescription<EntityTypes>>)
>;

interface QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes extends string, ResultType>
  extends BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  provides: ResultDescription<EntityTypes, ResultType>;
  invalidates?: never;
}

interface MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes extends string, ResultType>
  extends BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  invalidates: ResultDescription<EntityTypes, ResultType>;
  provides?: never;
}

type EndpointDefinition<QueryArg, InternalQueryArgs, EntityTypes extends string, ResultType> =
  | QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>
  | MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;

type EndpointDefinitions = Record<string, EndpointDefinition<any, any, any, any>>;

function isQueryDefinition(e: EndpointDefinition<any, any, any, any>): e is QueryDefinition<any, any, any, any> {
  return 'provides' in e;
}

function isMutationDefinition(e: EndpointDefinition<any, any, any, any>): e is MutationDefinition<any, any, any, any> {
  return 'invalidates' in e;
}

type EndpointBuilder<InternalQueryArgs, EntityTypes extends string> = {
  query<ResultType, QueryArg>(
    definition: QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>
  ): QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;
  mutation<ResultType, QueryArg>(
    definition: MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>
  ): MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;
};

type Id<T> = { [K in keyof T]: T[K] } & {};

type QuerySubstateIdentifier = { endpoint: string; serializedQueryArgs: string };

interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier {
  internalQueryArgs: InternalQueryArgs;
}

type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any>, ThunkArg> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  infer ResultType
>
  ? (arg: QueryArg) => AsyncThunkAction<ResultType, ThunkArg, {}>
  : never;

type QueryActions<Definitions extends EndpointDefinitions, InternalQueryArgs> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? StartQueryActionCreator<Definitions[K], QueryThunkArg<InternalQueryArgs>>
    : never;
};

type MutationSubstateIdentifier = { endpoint: string; requestId: string };

interface MutationThunkArg<InternalQueryArgs> {
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
}

type StartMutationActionCreator<
  D extends MutationDefinition<any, any, any, any>,
  ThunkArg
> = D extends MutationDefinition<infer QueryArg, any, any, infer ResultType>
  ? (arg: QueryArg) => AsyncThunkAction<ResultType, ThunkArg, {}>
  : never;

type MutationActions<Definitions extends EndpointDefinitions, InternalQueryArgs> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<infer QueryArg, infer InternalQueryArg, any, any>
    ? StartMutationActionCreator<Definitions[K], MutationThunkArg<InternalQueryArgs>>
    : never;
};

enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

type QueryResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<infer QueryArg, any, any, infer ResultType>
    ? (queryArg: QueryArg) => (state: RootState) => QuerySubState<Definitions[K]>
    : never;
};

type MutationResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, infer ResultType>
    ? (requestId: string) => (state: RootState) => MutationSubState<Definitions[K]>
    : never;
};

type QueryHook<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<infer QueryArg, any, any, any>
  ? (arg: QueryArg) => QuerySubState<D>
  : never;

type MutationHook<D extends MutationDefinition<any, any, any, any>> = D extends MutationDefinition<
  infer QueryArg,
  any,
  any,
  infer ResultType
>
  ? () => [(arg: QueryArg) => Promise<ResultType>, MutationSubState<D>]
  : never;

type Hooks<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<infer QueryArg, any, any, infer ResultType>
    ? {
        useQuery: QueryHook<Definitions[K]>;
      }
    : Definitions[K] extends MutationDefinition<infer QueryArg, any, any, infer ResultType>
    ? {
        useMutation: MutationHook<Definitions[K]>;
      }
    : never;
};

type Subscribers = string[];

type QueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];
type MutationKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];

type QueryArgs<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<infer QA, any, any>
  ? QA
  : unknown;
type ResultType<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<any, any, infer RT>
  ? RT
  : unknown;
type EntityType<D extends BaseEndpointDefinition<any, any, any>> = D extends QueryDefinition<any, any, infer T, any>
  ? T
  : string;

type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    };

type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
    };

type QueryState<D extends EndpointDefinitions> = {
  queries: {
    [K in QueryKeys<D>]?: {
      [stringifiedArgs in string]?: QuerySubState<D[K]>;
    };
  };
  mutations: {
    [K in MutationKeys<D>]?: {
      [requestId in string]?: MutationSubState<D[K]>;
    };
  };
};

function defaultSerializeQueryArgs(args: any) {
  return JSON.stringify(args);
}

const __phantomType_ReducerPath = Symbol();
interface QueryStatePhantomType<Identifier extends string> {
  [__phantomType_ReducerPath]: Identifier;
}

// abuse immer to freeze default states
const defaultQuerySubState = createNextState(
  {},
  (): QuerySubState<any> => {
    return {
      status: QueryStatus.uninitialized,
      subscribers: [],
      resultingEntities: [],
    };
  }
);
const defaultMutationSubState = createNextState(
  {},
  (): MutationSubState<any> => {
    return {
      status: QueryStatus.uninitialized,
    };
  }
);

export function createApi<
  InternalQueryArgs,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
>({
  baseQuery,
  reducerPath,
  serializeQueryArgs = defaultSerializeQueryArgs,
  endpoints,
}: {
  baseQuery(args: InternalQueryArgs): any;
  entityTypes: readonly EntityTypes[];
  reducerPath: ReducerPath;
  serializeQueryArgs?(args: InternalQueryArgs): string;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
}) {
  type State = QueryState<Definitions>;
  type InternalState = QueryState<any>;
  type RootState = {
    [K in ReducerPath]: State & QueryStatePhantomType<ReducerPath>;
  };
  type InternalRootState = {
    [K in ReducerPath]: InternalState;
  };

  const queryThunk = createAsyncThunk<unknown, QueryThunkArg<InternalQueryArgs>, { state: InternalRootState }>(
    `${reducerPath}/executeQuery`,
    (arg) => {
      return baseQuery(arg.internalQueryArgs);
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.endpoint]?.[arg.serializedQueryArgs];
        return requestState?.status !== 'pending';
      },
      dispatchConditionRejection: true,
    }
  );

  const mutationThunk = createAsyncThunk<unknown, MutationThunkArg<InternalQueryArgs>, { state: InternalRootState }>(
    `${reducerPath}/executeMutation`,
    (arg) => {
      return baseQuery(arg.internalQueryArgs);
    }
  );

  const initialState: State = {
    queries: {},
    mutations: {},
  };

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

  const slice = createSlice({
    name: `${reducerPath}/state`,
    initialState: initialState as InternalState,
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

  const endpointDefinitions = endpoints({
    query: (x) => x,
    mutation: (x) => x,
  });

  const queryActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isQueryDefinition(endpoint)) {
        acc[name] = (arg) => {
          const internalQueryArgs = endpoint.query(arg);
          return queryThunk({
            endpoint: name,
            internalQueryArgs,
            serializedQueryArgs: serializeQueryArgs(internalQueryArgs),
          });
        };
      }
      return acc;
    },
    {} as Record<string, StartQueryActionCreator<any, any>>
  ) as QueryActions<Definitions, InternalQueryArgs>;

  const mutationActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = (arg) => {
          const internalQueryArgs = endpoint.query(arg);
          return mutationThunk({ endpoint: name, internalQueryArgs });
        };
      }
      return acc;
    },
    {} as Record<string, StartMutationActionCreator<any, any>>
  ) as MutationActions<Definitions, InternalQueryArgs>;

  const querySelectors = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = (arg) => (rootState) =>
        (rootState[reducerPath] as InternalState).queries[name]?.[serializeQueryArgs(endpoint.query(arg))] ??
        defaultQuerySubState;
    }
    return acc;
  }, {} as Record<string, (arg: unknown) => (state: RootState) => unknown>) as Id<
    QueryResultSelectors<Definitions, RootState>
  >;

  const mutationSelectors = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isMutationDefinition(endpoint)) {
      acc[name] = (mutationId: string) => (rootState) =>
        (rootState[reducerPath] as InternalState).mutations[name]?.[mutationId] ?? defaultMutationSubState;
    }
    return acc;
  }, {} as Record<string, (arg: string) => (state: RootState) => unknown>) as Id<
    MutationResultSelectors<Definitions, RootState>
  >;

  const middleware: Middleware<{}, RootState, ThunkDispatch<any, any, any>> = (api) => (next) => (action) => {
    const result = next(action);
    // TODO: invalidation & re-running queries
    return result;
  };

  const hooks = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = {
        useQuery: (args) => {
          const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
          useEffect(() => {
            const promise = dispatch(queryActions[name](args));
            return () =>
              void dispatch(
                slice.actions.unsubscribeQueryResult({
                  endpoint: name,
                  serializedQueryArgs: promise.arg.serializedQueryArgs,
                  requestId: promise.requestId,
                })
              );
          }, [args]);
          return useSelector(querySelectors[name](args));
        },
      };
    } else if (isMutationDefinition(endpoint)) {
      acc[name] = {
        useMutation: () => {
          const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
          const [promise, setPromise] = useState<ReturnType<AsyncThunkAction<any, any, any>>>();

          useEffect(() => {
            return () => {
              if (promise) {
                dispatch(slice.actions.unsubscribeMutationResult({ endpoint: name, requestId: promise.requestId }));
              }
            };
          }, []);

          return [
            function triggerMutation(args) {
              let newPromise: ReturnType<AsyncThunkAction<any, any, any>>;
              batch(() => {
                if (promise) {
                  dispatch(slice.actions.unsubscribeMutationResult({ endpoint: name, requestId: promise.requestId }));
                }
                newPromise = dispatch(mutationActions[name](args));
                setPromise(newPromise);
              });
              return newPromise!;
            },
            useSelector(mutationSelectors[name](promise?.requestId ?? '')),
          ];
        },
      };
    }
    return acc;
  }, {} as Record<string, { useQuery: QueryHook<any> } | { useMutation: MutationHook<any> }>) as Hooks<Definitions>;

  return {
    queryActions,
    mutationActions,
    reducer: (slice.reducer as any) as Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>,
    selectors: {
      query: querySelectors,
      mutation: mutationSelectors,
    },
    middleware,
    hooks,
  };
}
