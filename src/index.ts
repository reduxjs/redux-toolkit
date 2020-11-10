import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import { buildThunks, QueryApi } from './buildThunks';
import { buildSlice } from './buildSlice';
import { buildActionMaps } from './buildActionMaps';
import { buildSelectors } from './buildSelectors';
import { buildHooks } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import { EndpointDefinitions, EndpointBuilder, DefinitionType } from './endpointDefinitions';
import type { CombinedState, QueryCacheKey, QueryStatePhantomType } from './apiState';

export { fetchBaseQuery } from './fetchBaseQuery';
export { QueryStatus } from './apiState';

export type SerializeQueryArgs<InternalQueryArgs> = (args: InternalQueryArgs, endpoint: string) => string;
export type InternalSerializeQueryArgs<InternalQueryArgs> = (
  args: InternalQueryArgs,
  endpoint: string
) => QueryCacheKey;

function defaultSerializeQueryArgs(args: any, endpoint: string) {
  return `${endpoint}/${JSON.stringify(args)}`;
}

export function createApi<
  InternalQueryArgs,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
>({
  baseQuery,
  reducerPath,
  serializeQueryArgs: _serializeQueryArgs = defaultSerializeQueryArgs,
  endpoints,
  keepUnusedDataFor = 60,
}: {
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  entityTypes: readonly EntityTypes[];
  reducerPath: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<InternalQueryArgs>;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
  keepUnusedDataFor?: number;
}) {
  type State = CombinedState<Definitions, EntityTypes>;

  const serializeQueryArgs = _serializeQueryArgs as InternalSerializeQueryArgs<InternalQueryArgs>;

  const endpointDefinitions = endpoints({
    query: (x) => ({ ...x, type: DefinitionType.query }),
    mutation: (x) => ({ ...x, type: DefinitionType.mutation }),
  });

  const { queryThunk, mutationThunk } = buildThunks({ baseQuery, reducerPath, endpointDefinitions });

  const { reducer: _reducer, actions: sliceActions } = buildSlice({
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    reducerPath,
  });

  const reducer = (_reducer as any) as Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>;

  const { querySelectors, mutationSelectors } = buildSelectors({
    serializeQueryArgs,
    endpointDefinitions,
    reducerPath,
  });

  const { mutationActions, queryActions } = buildActionMaps({
    queryThunk,
    mutationThunk,
    serializeQueryArgs,
    endpointDefinitions,
    querySelectors,
    mutationSelectors,
    sliceActions,
  });

  const { middleware } = buildMiddleware({
    reducerPath,
    endpointDefinitions,
    queryActions,
    querySelectors,
    queryThunk,
    mutationThunk,
    keepUnusedDataFor,
    sliceActions,
  });

  const { hooks } = buildHooks({
    endpointDefinitions,
    querySelectors,
    queryActions,
    mutationSelectors,
    mutationActions,
  });

  return {
    queryActions,
    mutationActions,
    reducer,
    selectors: {
      query: querySelectors,
      mutation: mutationSelectors,
    },
    ...sliceActions,
    middleware,
    hooks,
  };
}
