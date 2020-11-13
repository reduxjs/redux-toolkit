import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import { buildThunks, QueryApi } from './buildThunks';
import { buildSlice } from './buildSlice';
import { buildActionMaps, EndpointActions } from './buildActionMaps';
import { buildSelectors, Selectors } from './buildSelectors';
import { buildHooks, Hooks } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import {
  EndpointDefinitions,
  EndpointBuilder,
  DefinitionType,
  EndpointDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from './endpointDefinitions';
import type { CombinedState, QueryCacheKey, QueryStatePhantomType, RootState } from './apiState';

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

  const selectors = {} as Selectors<Definitions, RootState<Definitions, EntityTypes, ReducerPath>>;
  const actions = {} as EndpointActions<Definitions>;
  const hooks = {} as Hooks<Definitions>;

  const buildSelector = buildSelectors({
    serializeQueryArgs,
    reducerPath,
  });

  const buildAction = buildActionMaps({
    queryThunk,
    mutationThunk,
    serializeQueryArgs,
    querySelectors: selectors as any,
    mutationSelectors: selectors as any,
    sliceActions,
  });

  const buildHook = buildHooks({
    querySelectors: selectors as any,
    queryActions: actions as any,
    mutationSelectors: selectors as any,
    mutationActions: actions as any,
  });

  const { middleware } = buildMiddleware({
    reducerPath,
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    keepUnusedDataFor,
    sliceActions,
  });

  function addDefinition(endpoint: string, definition: EndpointDefinition<any, any, any, any>): void;
  function addDefinition(endpoint: keyof Definitions & string, definition: EndpointDefinition<any, any, any, any>) {
    if (isQueryDefinition(definition)) {
      hooks[endpoint] = { useQuery: buildHook(endpoint, definition) } as any;
      selectors[endpoint] = buildSelector(endpoint, definition) as any;
      actions[endpoint] = buildAction(endpoint, definition) as any;
    } else if (isMutationDefinition(definition)) {
      hooks[endpoint] = { useMutation: buildHook(endpoint, definition) } as any;
      selectors[endpoint] = buildSelector(endpoint, definition) as any;
      actions[endpoint] = buildAction(endpoint, definition) as any;
    }
  }

  function addDefinitions(definitions: Definitions) {
    for (const [endpoint, defintion] of Object.entries(definitions)) {
      addDefinition(endpoint, defintion);
    }
  }

  addDefinitions(endpointDefinitions);

  return {
    reducerPath,
    actions,
    reducer,
    selectors,
    ...sliceActions,
    middleware,
    hooks,
    addDefinitions,
  };
}
