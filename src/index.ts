import {
  PayloadAction,
  Reducer,
  AnyAction,
  configureStore,
} from '@reduxjs/toolkit';

const resultType = Symbol();

type NoInfer<T> = [T][T extends any ? 0 : never];

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
    infer InternalQueryArg,
    any,
    any
  >
    ? (arg: QueryArg) => PayloadAction<InternalQueryArg>
    : Definitions[K];
};

type QueryStatus = 'uninitialized' | 'pending' | 'fulfilled' | 'rejected';

type ResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends BaseEndpointDefinition<
    infer QueryArg,
    any,
    infer ResultType
  >
    ? (
        queryArg: QueryArg
      ) => (state: RootState) => { status: QueryStatus; data: ResultType }
    : never;
};

type QueryState = {};

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

function createApi<
  InternalQueryArgs,
  Definitions extends EndpointDefinitions,
  EntityTypes extends string = never
>(definition: {
  baseQuery(args: InternalQueryArgs): any;
  entityTypes: readonly EntityTypes[];
  serializeQueryName?(method: string, args: InternalQueryArgs): string;
  endpoints(
    build: EndpointBuilder<InternalQueryArgs, EntityTypes>
  ): Definitions;
}) {
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

  return {} as {
    queryActions: Id<QueryActions<Definitions>>;
    mutationActions: Id<MutationActions<Definitions>>;
    getSelectors: <RootState>(
      getSlice: (state: RootState) => QueryState
    ) => Id<ResultSelectors<Definitions, RootState>>;
    reducer: Reducer<QueryState, AnyAction>;
    hooks: Hooks<Definitions>;
  };
}

interface QueryArg {
  queryString: string;
  method?: string;
  body?: string;
}

interface User {
  id: string;
  firstName: string;
}

const api = createApi({
  baseQuery({ queryString, method = 'GET', body }: QueryArg) {
    return fetch(`https://example.com/${queryString}`, {
      method,
      body,
    }).then(result => result.json());
  },
  entityTypes: ['User', 'Comment'],
  endpoints: build => ({
    getUser: build.query<User, string>({
      query(id) {
        return { queryString: `user/${id}` };
      },
      provides: [result => ({ type: 'User', id: result.id })],
    }),
    updateUser: build.mutation<User, { id: string; patch: Partial<User> }>({
      query({ id, patch }) {
        return {
          queryString: `user/${id}`,
          method: 'PATCH',
          body: JSON.stringify(patch),
        };
      },
      invalidates: [result => ({ type: 'User', id: result.id })],
    }),
  }),
});

const store = configureStore({
  reducer: {
    api: api.reducer,
  },
});
type RootState = ReturnType<typeof store.getState>;
const apiSelectors = api.getSelectors<RootState>(root => root.api);

store.dispatch(api.queryActions.getUser('5'));

const user5 = apiSelectors.getUser('5')(store.getState());

// hooks:
const queryResults = api.hooks.getUser.useQuery('5');
const [runMutation, mutationResults] = api.hooks.updateUser.useMutation();
