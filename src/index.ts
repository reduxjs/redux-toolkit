import {
  PayloadAction,
  configureStore,
  createSlice,
  createAsyncThunk,
  ThunkAction,
  Draft,
  createNextState,
  nanoid,
  Middleware,
  ThunkDispatch,
  AnyAction,
  Reducer,
  Slice,
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

type StartQueryAction<QueryArg, InternalQueryArgs> = PayloadAction<
  QueryArg,
  string,
  QuerySubstateIdentifier & { internalQueryArgs: InternalQueryArgs; subscriptionId: string }
>;

type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<
  infer QueryArg,
  infer InternalQueryArgs,
  any,
  any
>
  ? (arg: QueryArg) => StartQueryAction<QueryArg, InternalQueryArgs>
  : never;

type QueryActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<infer QueryArg, any, any, any>
    ? StartQueryActionCreator<Definitions[K]>
    : never;
};

type MutationSubstateIdentifier = { endpoint: string; subscriptionId: string };

type StartMutationAction<QueryArg, InternalQueryArgs> = PayloadAction<
  QueryArg,
  string,
  MutationSubstateIdentifier & { internalQueryArgs: InternalQueryArgs }
>;

type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = D extends MutationDefinition<
  infer QueryArg,
  infer InternalQueryArgs,
  any,
  any
>
  ? (arg: QueryArg) => StartMutationAction<QueryArg, InternalQueryArgs>
  : never;

type MutationActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<infer QueryArg, infer InternalQueryArg, any, any>
    ? StartMutationActionCreator<Definitions[K]>
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

  type QueryThunkArgs = QuerySubstateIdentifier & {
    internalQueryArgs: InternalQueryArgs;
  };

  const queryThunk = createAsyncThunk<unknown, QueryThunkArgs, { state: InternalRootState }>(
    `${reducerPath}/executeQuery`,
    (arg) => {
      return baseQuery(arg.internalQueryArgs);
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.endpoint]?.[arg.serializedQueryArgs];
        return requestState?.status !== 'pending';
      },
    }
  );

  type MutationThunkArgs = {
    endpoint: string;
    internalQueryArgs: InternalQueryArgs;
    subscriptionId: string;
  };

  const mutationThunk = createAsyncThunk<unknown, MutationThunkArgs, { state: InternalRootState }>(
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
    { endpoint, subscriptionId }: MutationSubstateIdentifier,
    update: (substate: MutationSubState<any>) => void
  ) {
    const substate = (state.mutations[endpoint] ??= {})[subscriptionId];
    if (substate) {
      update(substate);
    }
  }

  const slice = createSlice({
    name: `${reducerPath}/state`,
    initialState: initialState as InternalState,
    reducers: {
      startQuery: {
        reducer(draft, { meta: { endpoint, serializedQueryArgs, subscriptionId } }: StartQueryAction<any, any>) {
          const substate = ((draft.queries[endpoint] ??= {})[serializedQueryArgs] ??= {
            status: QueryStatus.uninitialized,
            resultingEntities: [],
            subscribers: [],
          });
          substate.subscribers.push(subscriptionId);
        },
        prepare(payload: unknown, meta: StartQueryAction<any, any>['meta']) {
          return { payload, meta };
        },
      },
      unsubscribeQueryResult(
        draft,
        {
          payload: { endpoint, serializedQueryArgs, subscriptionId },
        }: PayloadAction<{ subscriptionId: string } & QuerySubstateIdentifier>
      ) {
        const substate = draft.queries[endpoint]?.[serializedQueryArgs];
        if (!substate) return;
        const index = substate.subscribers.indexOf(subscriptionId);
        if (index >= 0) {
          substate.subscribers.splice(index, 1);
        }
      },
      startMutation: {
        reducer(draft, { meta: { endpoint, subscriptionId } }: StartMutationAction<any, any>) {
          (draft.mutations[endpoint] ??= {})[subscriptionId] ??= {
            status: QueryStatus.uninitialized,
          };
        },
        prepare(payload: unknown, meta: StartMutationAction<any, any>['meta']) {
          return { payload, meta };
        },
      },
      unsubscribeMutationResult(draft, action: PayloadAction<MutationSubstateIdentifier>) {
        const endpointState = draft.mutations[action.payload.endpoint];
        if (endpointState && action.payload.subscriptionId in endpointState) {
          delete endpointState[action.payload.subscriptionId];
        }
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(queryThunk.pending, (draft, action) => {
          updateQuerySubstateIfExists(draft, action.meta.arg, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.pending,
              arg: action.meta.arg.internalQueryArgs,
            });
          });
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
            Object.assign(substate, {
              status: QueryStatus.rejected,
            });
          });
        })
        .addCase(mutationThunk.pending, (draft, action) => {
          updateMutationSubstateIfExists(draft, action.meta.arg, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.pending,
              arg: action.meta.arg.internalQueryArgs,
            });
          });
        })
        .addCase(mutationThunk.fulfilled, (draft, action) => {
          updateMutationSubstateIfExists(draft, action.meta.arg, (substate) => {
            Object.assign(substate, {
              status: QueryStatus.fulfilled,
              data: action.payload,
              resultingEntities: [
                /* TODO */
              ],
            });
          });
        })
        .addCase(mutationThunk.rejected, (draft, action) => {
          updateMutationSubstateIfExists(draft, action.meta.arg, (substate) => {
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
          const subscriptionId = nanoid();
          return slice.actions.startQuery(arg, {
            endpoint: name,
            internalQueryArgs,
            serializedQueryArgs: serializeQueryArgs(internalQueryArgs),
            subscriptionId,
          });
        };
      }
      return acc;
    },
    {} as Record<string, StartQueryActionCreator<any>>
  ) as QueryActions<Definitions>;

  const mutationActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = (arg) => {
          const internalQueryArgs = endpoint.query(arg);
          const subscriptionId = nanoid();
          return slice.actions.startMutation(arg, { endpoint: name, internalQueryArgs, subscriptionId });
        };
      }
      return acc;
    },
    {} as Record<string, StartMutationActionCreator<any>>
  ) as MutationActions<Definitions>;

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

    if (slice.actions.startQuery.match(action)) {
      api.dispatch(queryThunk(action.meta));
      const unsubscribeAction = slice.actions.unsubscribeQueryResult(action.meta);
      return unsubscribeAction;
    }
    if (slice.actions.startMutation.match(action)) {
      api.dispatch(mutationThunk(action.meta));
      const unsubscribeAction = slice.actions.unsubscribeMutationResult(action.meta);
      return unsubscribeAction;
    }

    return result;
  };

  const hooks = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = {
        useQuery: (args) => {
          const dispatch = useDispatch();
          useEffect(() => {
            const unsubscribeAction = dispatch(queryActions[name](args));
            return () => void dispatch(unsubscribeAction);
          }, [args]);
          return useSelector(querySelectors[name](args));
        },
      };
    } else if (isMutationDefinition(endpoint)) {
      acc[name] = {
        // @ts-ignore TODO: does not return a promise as of now
        // probably dispatch an asyncthunk, but patch asyncThunk so that the `requestId` is available as a property of `asyncThunk`?
        // or handle that unsubscribing via `.cancel`?
        useMutation: () => {
          const dispatch = useDispatch();
          const [unsubscribeAction, setUnsubscribeAction] = useState<
            ReturnType<typeof slice.actions.unsubscribeMutationResult>
          >();

          useEffect(() => {
            return () => {
              if (unsubscribeAction) {
                dispatch(unsubscribeAction);
              }
            };
          }, []);

          return [
            function triggerMutation(args) {
              batch(() => {
                if (unsubscribeAction) {
                  dispatch(unsubscribeAction);
                }
                setUnsubscribeAction(dispatch(mutationActions[name](args)));
              });
            },
            useSelector(mutationSelectors[name](unsubscribeAction?.payload.subscriptionId ?? '')),
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
