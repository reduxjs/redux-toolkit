import { buildThunks } from './buildThunks';
import type { AnyAction, Reducer, ThunkAction } from '@reduxjs/toolkit';
import { buildSlice, SliceActions } from './buildSlice';
import { buildActionMaps } from './buildActionMaps';
import { buildSelectors } from './buildSelectors';
import { buildHooks, PrefetchOptions } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import {
  EndpointDefinitions,
  EndpointBuilder,
  DefinitionType,
  isQueryDefinition,
  isMutationDefinition,
  AssertEntityTypes,
} from './endpointDefinitions';
import type { CombinedState, QueryCacheKey, QueryStatePhantomType } from './apiState';
import { assertCast, BaseQueryArg } from './tsHelpers';
import { Api, BaseQueryFn } from './apiTypes';
export { Api, ApiWithInjectedEndpoints } from './apiTypes';
export { fetchBaseQuery, FetchBaseQueryError } from './fetchBaseQuery';
export { QueryStatus } from './apiState';

export type SerializeQueryArgs<InternalQueryArgs> = (_: {
  queryArgs: any;
  internalQueryArgs: InternalQueryArgs;
  endpoint: string;
}) => string;

export type InternalSerializeQueryArgs<InternalQueryArgs> = (_: {
  queryArgs: any;
  internalQueryArgs: InternalQueryArgs;
  endpoint: string;
}) => QueryCacheKey;

const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({ endpoint, queryArgs }) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than  useQuery({ b: 2, a: 1 })
  return `${endpoint}(${JSON.stringify(queryArgs, Object.keys(queryArgs || {}).sort())})`;
};

const IS_DEV = () => typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export function createApi<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
>({
  baseQuery,
  entityTypes = [],
  reducerPath = 'api' as ReducerPath,
  serializeQueryArgs = defaultSerializeQueryArgs,
  endpoints,
  keepUnusedDataFor = 60,
}: {
  baseQuery: BaseQuery;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  endpoints(build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>): Definitions;
  keepUnusedDataFor?: number;
}): Api<BaseQuery, Definitions, ReducerPath, EntityTypes> {
  type State = CombinedState<Definitions, EntityTypes>;

  type InternalQueryArgs = BaseQueryArg<BaseQuery>;

  assertCast<InternalSerializeQueryArgs<InternalQueryArgs>>(serializeQueryArgs);

  const endpointDefinitions: EndpointDefinitions = {};

  const assertEntityType: AssertEntityTypes = (entity) => {
    if (IS_DEV()) {
      if (!entityTypes.includes(entity.type as any)) {
        console.error(`Entity type '${entity.type}' was used, but not specified in \`entityTypes\`!`);
      }
    }
    return entity;
  };

  const uninitialized: any = () => {
    throw Error('called before initialization');
  };

  const api: Api<BaseQuery, {}, ReducerPath, EntityTypes> = {
    reducerPath,
    endpoints: {},
    internalActions: {
      removeQueryResult: uninitialized,
      unsubscribeMutationResult: uninitialized,
      unsubscribeQueryResult: uninitialized,
      updateSubscriptionOptions: uninitialized,
      queryResultPatched: uninitialized,
      prefetchThunk: uninitialized,
    },
    util: {
      patchQueryResult: uninitialized,
      updateQueryResult: uninitialized,
    },
    usePrefetch: () => () => {},
    reducer: uninitialized,
    middleware: uninitialized,
    injectEndpoints,
  };

  const {
    queryThunk,
    mutationThunk,
    patchQueryResult,
    updateQueryResult,
    prefetchThunk,
    buildMatchThunkActions,
  } = buildThunks({
    baseQuery,
    reducerPath,
    endpointDefinitions,
    api,
    serializeQueryArgs,
  });
  Object.assign(api.util, { patchQueryResult, updateQueryResult });

  const { reducer, actions: sliceActions } = buildSlice({
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    reducerPath,
    assertEntityType,
  });
  assertCast<Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>>(reducer);
  Object.assign(api.internalActions, sliceActions);
  api.reducer = reducer;

  Object.assign(api.internalActions, sliceActions, { prefetchThunk });
  api.reducer = reducer;

  const { middleware } = buildMiddleware({
    reducerPath,
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    keepUnusedDataFor,
    api,
    assertEntityType,
  });

  api.middleware = middleware;

  const { buildQuerySelector, buildMutationSelector } = buildSelectors({
    serializeQueryArgs,
    reducerPath,
  });

  const { buildQueryAction, buildMutationAction } = buildActionMaps({
    queryThunk,
    mutationThunk,
    api,
    serializeQueryArgs,
  });

  const { buildQueryHook, buildMutationHook, usePrefetch } = buildHooks({ api });

  api.usePrefetch = usePrefetch;

  function injectEndpoints(inject: Parameters<typeof api.injectEndpoints>[0]) {
    const evaluatedEndpoints = inject.endpoints({
      query: (x) => ({ ...x, type: DefinitionType.query }),
      mutation: (x) => ({ ...x, type: DefinitionType.mutation }),
    });
    for (const [endpoint, definition] of Object.entries(evaluatedEndpoints)) {
      if (IS_DEV()) {
        if (!inject.overrideExisting && endpoint in endpointDefinitions) {
          console.error(
            `called \`injectEndpoints\` to override already-existing endpoint ${endpoint} without specifying \`overrideExisting: true\``
          );
          return;
        }
      }
      endpointDefinitions[endpoint] = definition;

      assertCast<Api<InternalQueryArgs, Record<string, any>, ReducerPath, EntityTypes>>(api);
      if (isQueryDefinition(definition)) {
        const useQuery = buildQueryHook(endpoint);
        api.endpoints[endpoint] = {
          select: buildQuerySelector(endpoint, definition),
          initiate: buildQueryAction(endpoint, definition),
          useQuery,
          ...buildMatchThunkActions(queryThunk, endpoint),
        };
        (api as any)[`use${capitalize(endpoint)}Query`] = useQuery;
      } else if (isMutationDefinition(definition)) {
        const useMutation = buildMutationHook(endpoint);
        api.endpoints[endpoint] = {
          select: buildMutationSelector(),
          initiate: buildMutationAction(endpoint, definition),
          useMutation,
          ...buildMatchThunkActions(mutationThunk, endpoint),
        };
        (api as any)[`use${capitalize(endpoint)}Mutation`] = useMutation;
      }
    }

    return api as any;
  }

  return api.injectEndpoints({ endpoints });
}

export type InternalActions = SliceActions & {
  prefetchThunk: (endpointName: any, arg: any, options: PrefetchOptions) => ThunkAction<void, any, any, AnyAction>;
};

function capitalize(str: string) {
  return str.replace(str[0], str[0].toUpperCase());
}
