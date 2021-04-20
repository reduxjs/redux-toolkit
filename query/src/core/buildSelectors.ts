import { createNextState, createSelector } from '@reduxjs/toolkit';
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RootState as _RootState,
  getRequestStatusFlags,
  RequestStatusFlags,
} from './apiState';
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  TagTypesFrom,
  ReducerPathFrom,
} from '../endpointDefinitions';
import { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs';

export const skipSelector = Symbol('skip selector');

declare module './module' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    select: QueryResultSelectorFactory<
      Definition,
      _RootState<Definitions, TagTypesFrom<Definition>, ReducerPathFrom<Definition>>
    >;
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    select: MutationResultSelectorFactory<
      Definition,
      _RootState<Definitions, TagTypesFrom<Definition>, ReducerPathFrom<Definition>>
    >;
  }
}

type QueryResultSelectorFactory<Definition extends QueryDefinition<any, any, any, any>, RootState> = (
  queryArg: QueryArgFrom<Definition> | typeof skipSelector
) => (state: RootState) => QueryResultSelectorResult<Definition>;

export type QueryResultSelectorResult<
  Definition extends QueryDefinition<any, any, any, any>
> = QuerySubState<Definition> & RequestStatusFlags;

type MutationResultSelectorFactory<Definition extends MutationDefinition<any, any, any, any>, RootState> = (
  requestId: string | typeof skipSelector
) => (state: RootState) => MutationResultSelectorResult<Definition>;

export type MutationResultSelectorResult<
  Definition extends MutationDefinition<any, any, any, any>
> = MutationSubState<Definition> & RequestStatusFlags;

const initialSubState = {
  status: QueryStatus.uninitialized as const,
};

// abuse immer to freeze default states
const defaultQuerySubState = createNextState({}, (): QuerySubState<any> => initialSubState);
const defaultMutationSubState = createNextState({}, (): MutationSubState<any> => initialSubState);

export function buildSelectors<InternalQueryArgs, Definitions extends EndpointDefinitions, ReducerPath extends string>({
  serializeQueryArgs,
  reducerPath,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  reducerPath: ReducerPath;
}) {
  type RootState = _RootState<Definitions, string, string>;

  return { buildQuerySelector, buildMutationSelector };

  function withRequestFlags<T extends { status: QueryStatus }>(substate: T): T & RequestStatusFlags {
    return {
      ...substate,
      ...getRequestStatusFlags(substate.status),
    };
  }

  function selectInternalState(rootState: RootState) {
    return rootState[reducerPath];
  }

  function buildQuerySelector(
    endpointName: string,
    endpointDefinition: QueryDefinition<any, any, any, any>
  ): QueryResultSelectorFactory<any, RootState> {
    return (queryArgs) => {
      const selectQuerySubState = createSelector(
        selectInternalState,
        (internalState) =>
          (queryArgs === skipSelector
            ? undefined
            : internalState.queries[serializeQueryArgs({ queryArgs, endpointDefinition, endpointName })]) ??
          defaultQuerySubState
      );
      return createSelector(selectQuerySubState, withRequestFlags);
    };
  }

  function buildMutationSelector(): MutationResultSelectorFactory<any, RootState> {
    return (mutationId) => {
      const selectMutationSubstate = createSelector(
        selectInternalState,
        (internalState) =>
          (mutationId === skipSelector ? undefined : internalState.mutations[mutationId]) ?? defaultMutationSubState
      );
      return createSelector(selectMutationSubstate, withRequestFlags);
    };
  }
}
