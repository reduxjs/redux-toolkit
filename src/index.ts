import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import type { CombinedState, ModifiableConfigState, QueryStatePhantomType } from './apiState';
import { Api, BaseQueryArg, BaseQueryFn } from './apiTypes';
import { buildActionMaps } from './buildActionMaps';
import { buildHooks } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import { buildSelectors } from './buildSelectors';
import { buildSlice } from './buildSlice';
import { buildThunks } from './buildThunks';
import { defaultSerializeQueryArgs, InternalSerializeQueryArgs, SerializeQueryArgs } from './defaultSerializeQueryArgs';
import {
  AssertEntityTypes,
  DefinitionType,
  EndpointBuilder,
  EndpointDefinitions,
  isMutationDefinition,
  isQueryDefinition,
} from './endpointDefinitions';
import { assertCast } from './tsHelpers';
import { capitalize, IS_DEV } from './utils';
import { onFocus, onFocusLost, onOnline, onOffline } from './setupListeners';
export { ApiProvider } from './ApiProvider';
export { QueryStatus } from './apiState';
export type { Api, ApiWithInjectedEndpoints, BaseQueryEnhancer, BaseQueryFn } from './apiTypes';
export { fetchBaseQuery } from './fetchBaseQuery';
export type { FetchBaseQueryError, FetchArgs } from './fetchBaseQuery';
export { retry } from './retry';
export { setupListeners } from './setupListeners';

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
  refetchOnMountOrArgChange = false,
  refetchOnFocus = false,
  refetchOnReconnect = false,
}: {
  baseQuery: BaseQuery;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  endpoints(build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>): Definitions;
  keepUnusedDataFor?: number;
  refetchOnMountOrArgChange?: boolean | number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
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
      onOnline,
      onOffline,
      onFocus,
      onFocusLost,
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

  const config: ModifiableConfigState = {
    refetchOnFocus,
    refetchOnReconnect,
    refetchOnMountOrArgChange,
    keepUnusedDataFor,
  };

  const { reducer, actions: sliceActions } = buildSlice({
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    reducerPath,
    assertEntityType,
    config,
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
      query: (x) => ({ ...x, type: DefinitionType.query } as any),
      mutation: (x) => ({ ...x, type: DefinitionType.mutation } as any),
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
