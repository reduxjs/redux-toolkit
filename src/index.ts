import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import { buildThunks } from './buildThunks';
import { buildSlice } from './buildSlice';
import { buildActionMaps } from './buildActionMaps';
import { buildSelectors } from './buildSelectors';
import { buildHooks } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import type { EndpointDefinitions, EndpointBuilder } from './endpointDefinitions';
import type { QueryState, QueryStatePhantomType } from './apiState';

function defaultSerializeQueryArgs(args: any) {
  return JSON.stringify(args);
}

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

  const endpointDefinitions = endpoints({
    query: (x) => x,
    mutation: (x) => x,
  });

  const { queryThunk, mutationThunk } = buildThunks({ baseQuery, reducerPath });

  const { slice } = buildSlice({ queryThunk, mutationThunk, reducerPath });

  const reducer = (slice.reducer as any) as Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>;

  const { mutationActions, queryActions } = buildActionMaps({
    queryThunk,
    mutationThunk,
    serializeQueryArgs,
    endpointDefinitions,
  });

  const { querySelectors, mutationSelectors } = buildSelectors({
    serializeQueryArgs,
    endpointDefinitions,
    reducerPath,
  });

  const { middleware } = buildMiddleware();

  const { hooks } = buildHooks({
    endpointDefinitions,
    querySelectors,
    queryActions,
    unsubscribeQueryResult: slice.actions.unsubscribeQueryResult,
    mutationSelectors,
    mutationActions,
    unsubscribeMutationResult: slice.actions.unsubscribeMutationResult,
  });

  return {
    queryActions,
    mutationActions,
    reducer,
    selectors: {
      query: querySelectors,
      mutation: mutationSelectors,
    },
    middleware,
    hooks,
  };
}
