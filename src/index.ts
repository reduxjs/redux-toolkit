import {
  PayloadAction,
  configureStore,
  createSlice,
  createAsyncThunk,
  ThunkAction,
  Draft,
  createNextState,
} from '@reduxjs/toolkit';

const resultType = Symbol();

// type NoInfer<T> = [T][T extends any ? 0 : never];

interface BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  query(arg: QueryArg): InternalQueryArgs;
  [resultType]?: ResultType;
}

type EntityDescription<EntityType> = { type: EntityType; id?: number | string };
type ResultDescription<EntityTypes extends string, ResultType> = ReadonlyArray<
  | EntityDescription<EntityTypes>
  | ((
      result: ResultType
    ) =>
      | EntityDescription<EntityTypes>
      | ReadonlyArray<EntityDescription<EntityTypes>>)
>;

interface QueryDefinition<
  QueryArg,
  InternalQueryArgs,
  EntityTypes extends string,
  ResultType
> extends BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  provides: ResultDescription<EntityTypes, ResultType>;
  invalidates?: never;
}

interface MutationDefinition<
  QueryArg,
  InternalQueryArgs,
  EntityTypes extends string,
  ResultType
> extends BaseEndpointDefinition<QueryArg, InternalQueryArgs, ResultType> {
  invalidates: ResultDescription<EntityTypes, ResultType>;
  provides?: never;
}

type EndpointDefinition<
  QueryArg,
  InternalQueryArgs,
  EntityTypes extends string,
  ResultType
> =
  | QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>
  | MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;

type EndpointDefinitions = Record<
  string,
  EndpointDefinition<any, any, any, any>
>;

function isQueryDefinition(
  e: EndpointDefinition<any, any, any, any>
): e is QueryDefinition<any, any, any, any> {
  return 'provides' in e;
}

function isMutationDefinition(
  e: EndpointDefinition<any, any, any, any>
): e is MutationDefinition<any, any, any, any> {
  return 'invalidates' in e;
}

type EndpointBuilder<InternalQueryArgs, EntityTypes extends string> = {
  query<ResultType, QueryArg>(
    definition: QueryDefinition<
      QueryArg,
      InternalQueryArgs,
      EntityTypes,
      ResultType
    >
  ): QueryDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;
  mutation<ResultType, QueryArg>(
    definition: MutationDefinition<
      QueryArg,
      InternalQueryArgs,
      EntityTypes,
      ResultType
    >
  ): MutationDefinition<QueryArg, InternalQueryArgs, EntityTypes, ResultType>;
};

type Id<T> = { [K in keyof T]: T[K] } & {};

type QueryActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    infer QueryArg,
    any,
    any,
    infer ResultType
  >
    ? (arg: QueryArg) => ThunkAction<ResultType, any, any, any>
    : never;
};

type MutationActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<
    infer QueryArg,
    infer InternalQueryArg,
    any,
    any
  >
    ? (arg: QueryArg) => PayloadAction<InternalQueryArg>
    : never;
};

enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

type QueryResultSelectors<
  Definitions extends EndpointDefinitions,
  RootState
> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    infer QueryArg,
    any,
    any,
    infer ResultType
  >
    ? (
        queryArg: QueryArg
      ) => (state: RootState) => QuerySubState<Definitions[K]>
    : never;
};

type MutationResultSelectors<
  Definitions extends EndpointDefinitions,
  RootState
> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<
    any,
    any,
    any,
    infer ResultType
  >
    ? (
        requestId: string
      ) => (state: RootState) => MutationSubState<Definitions[K]>
    : never;
};

type Hooks<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    infer QueryArg,
    any,
    any,
    infer ResultType
  >
    ? {
        useQuery(arg: QueryArg): { status: QueryStatus; data: ResultType };
      }
    : Definitions[K] extends MutationDefinition<
        infer QueryArg,
        any,
        any,
        infer ResultType
      >
    ? {
        useMutation(): [
          (arg: QueryArg) => Promise<ResultType>,
          { status: QueryStatus; data: ResultType }
        ];
      }
    : never;
};

type Subscribers = string[];

type QueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    any,
    any,
    any,
    any
  >
    ? K
    : never;
}[keyof Definitions];
type MutationKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<
    any,
    any,
    any,
    any
  >
    ? K
    : never;
}[keyof Definitions];

type QueryArgs<
  D extends BaseEndpointDefinition<any, any, any>
> = D extends BaseEndpointDefinition<infer QA, any, any> ? QA : unknown;
type ResultType<
  D extends BaseEndpointDefinition<any, any, any>
> = D extends BaseEndpointDefinition<any, any, infer RT> ? RT : unknown;
type EntityType<
  D extends BaseEndpointDefinition<any, any, any>
> = D extends QueryDefinition<any, any, infer T, any> ? T : string;

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
  EntityTypes extends string = never
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
  endpoints(
    build: EndpointBuilder<InternalQueryArgs, EntityTypes>
  ): Definitions;
}) {
  serializeQueryArgs({} as any);

  type State = QueryState<Definitions>;
  type InternalState = QueryState<any>;
  type RootState = {
    [K in ReducerPath]: State & QueryStatePhantomType<ReducerPath>;
  };
  type InternalRootState = {
    [K in ReducerPath]: InternalState;
  };

  type QueryThunkArgs = {
    endpoint: string;
    serializedQueryArgs: string;
    internalQueryArgs: InternalQueryArgs;
  };

  const queryThunk = createAsyncThunk<
    unknown,
    QueryThunkArgs,
    { state: InternalRootState }
  >(
    `${reducerPath}/executeQuery`,
    (arg) => {
      return baseQuery(arg.internalQueryArgs);
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.endpoint]?.[
          arg.serializedQueryArgs
        ];
        return requestState?.status !== 'pending';
      },
    }
  );

  type MutationThunkArgs = {
    endpoint: string;
    serializedQueryArgs: string;
    internalQueryArgs: InternalQueryArgs;
  };

  const mutationThunk = createAsyncThunk<
    unknown,
    MutationThunkArgs,
    { state: InternalRootState }
  >(`${reducerPath}/executeMutation`, (arg) => {
    return baseQuery(arg.internalQueryArgs);
  });

  const initialState: State = {
    queries: {},
    mutations: {},
  };

  function getQuerySubState(
    state: Draft<State>,
    {
      meta: { arg },
    }: { meta: { arg: { endpoint: string; serializedQueryArgs: string } } }
  ) {
    return (((state as InternalState).queries[arg.endpoint] ??= {})[
      arg.serializedQueryArgs
    ] ??= {
      status: QueryStatus.uninitialized,
      resultingEntities: [],
      subscribers: [],
    });
  }

  function getMutationSubState(
    state: Draft<State>,
    {
      meta: { arg, requestId },
    }: { meta: { arg: { endpoint: string }; requestId: string } }
  ) {
    return (((state as InternalState).mutations[arg.endpoint] ??= {})[
      requestId
    ] ??= {
      status: QueryStatus.uninitialized,
    });
  }

  const slice = createSlice({
    name: `${reducerPath}/states`,
    initialState: initialState as Id<
      State & QueryStatePhantomType<ReducerPath>
    >,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(queryThunk.pending, (draft, action) => {
          Object.assign(getQuerySubState(draft, action), {
            status: QueryStatus.pending,
            arg: action.meta.arg.internalQueryArgs,
          });
        })
        .addCase(queryThunk.fulfilled, (draft, action) => {
          Object.assign(getQuerySubState(draft, action), {
            status: QueryStatus.fulfilled,
            data: action.payload,
            resultingEntities: [
              /* TODO */
            ],
          });
        })
        .addCase(queryThunk.rejected, (draft, action) => {
          Object.assign(getQuerySubState(draft, action), {
            status: QueryStatus.rejected,
          });
        })
        .addCase(mutationThunk.pending, (draft, action) => {
          Object.assign(getMutationSubState(draft, action), {
            status: QueryStatus.pending,
            arg: action.meta.arg.internalQueryArgs,
          });
        })
        .addCase(mutationThunk.fulfilled, (draft, action) => {
          Object.assign(getMutationSubState(draft, action), {
            status: QueryStatus.fulfilled,
            data: action.payload,
            resultingEntities: [
              /* TODO */
            ],
          });
        })
        .addCase(mutationThunk.rejected, (draft, action) => {
          Object.assign(getMutationSubState(draft, action), {
            status: QueryStatus.rejected,
          });
        });
    },
  });

  const endpointDefinitions = endpoints({
    query: (x) => x,
    mutation: (x) => x,
  });

  const queryActions = Object.entries(endpointDefinitions).reduce(
    (
      acc,
      [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]
    ) => {
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
    {} as Record<string, ThunkAction<any, any, any, any>>
  );

  const mutationActions = Object.entries(endpointDefinitions).reduce(
    (
      acc,
      [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]
    ) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = (arg) => {
          const internalQueryArgs = endpoint.query(arg);
          return mutationThunk({
            endpoint: name,
            internalQueryArgs,
            serializedQueryArgs: serializeQueryArgs(internalQueryArgs),
          });
        };
      }
      return acc;
    },
    {} as Record<string, ThunkAction<any, any, any, any>>
  );

  const querySelectors = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]) => {
      if (isQueryDefinition(endpoint)) {
        acc[name] = (arg) => (rootState) =>
          (rootState[reducerPath] as InternalState).queries[name]?.[
            serializeQueryArgs(endpoint.query(arg))
          ] ?? defaultQuerySubState;
      }
      return acc;
    },
    {} as Record<string, (arg: unknown) => (state: RootState) => unknown>
  );

  const mutationSelectors = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = (mutationId: string) => (rootState) =>
          (rootState[reducerPath] as InternalState).mutations[name]?.[
            mutationId
          ] ?? defaultMutationSubState;
      }
      return acc;
    },
    {} as Record<string, (arg: string) => (state: RootState) => unknown>
  );

  return {
    queryActions,
    mutationActions,
    reducer: slice.reducer,
    selectors: {
      query: querySelectors,
      mutation: mutationSelectors,
    },
  } as {
    queryActions: Id<QueryActions<Definitions>>;
    mutationActions: Id<MutationActions<Definitions>>;
    selectors: {
      query: Id<QueryResultSelectors<Definitions, RootState>>;
      mutation: Id<MutationResultSelectors<Definitions, RootState>>;
    };
    reducer: typeof slice.reducer;
    hooks: Hooks<Definitions>;
  };
}
