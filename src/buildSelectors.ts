import { createNextState, createSelector } from '@reduxjs/toolkit';
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RootState as _RootState,
  getRequestStatusFlags,
  RequestStatusFlags,
} from './apiState';
import { EndpointDefinitions, QueryDefinition, MutationDefinition, QueryArgFrom } from './endpointDefinitions';
import type { InternalState } from './buildSlice';
import { InternalSerializeQueryArgs } from '.';

export const skipSelector = Symbol('skip selector');

export type Selectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? QueryResultSelector<Definitions[K], RootState>
    : Definitions[K] extends MutationDefinition<any, any, any, any>
    ? MutationResultSelector<Definitions[K], RootState>
    : never;
};

export type QueryResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<infer QueryArg, any, any, infer ResultType>
    ? (
        queryArg: QueryArg | typeof skipSelector
      ) => (state: RootState) => QuerySubState<Definitions[K]> & RequestStatusFlags
    : never;
};

export type MutationResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, infer ResultType>
    ? (
        requestId: string | typeof skipSelector
      ) => (state: RootState) => MutationSubState<Definitions[K]> & RequestStatusFlags
    : never;
};

export type QueryResultSelector<Definition extends QueryDefinition<any, any, any, any>, RootState> = (
  queryArg: QueryArgFrom<Definition> | typeof skipSelector
) => (state: RootState) => QuerySubState<Definition> & RequestStatusFlags;
export type MutationResultSelector<Definition extends MutationDefinition<any, any, any, any>, RootState> = (
  requestId: string | typeof skipSelector
) => (state: RootState) => MutationSubState<Definition> & RequestStatusFlags;

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
  type RootState = _RootState<Definitions, string, ReducerPath>;

  return { buildQuerySelector, buildMutationSelector };

  function withRequestFlags<T extends { status: QueryStatus }>(substate: T): T & RequestStatusFlags {
    return {
      ...substate,
      ...getRequestStatusFlags(substate.status),
    };
  }

  function selectInternalState(rootState: RootState) {
    return rootState[reducerPath] as InternalState;
  }

  function buildQuerySelector(
    endpoint: string,
    definition: QueryDefinition<any, any, any, any>
  ): QueryResultSelector<any, RootState> {
    return (arg?) => {
      const selectQuerySubState = createSelector(
        selectInternalState,
        (internalState) =>
          (arg === skipSelector
            ? undefined
            : internalState.queries[serializeQueryArgs(definition.query(arg), endpoint)]) ?? defaultQuerySubState
      );
      return createSelector(selectQuerySubState, withRequestFlags);
    };
  }

  function buildMutationSelector(): MutationResultSelector<any, RootState> {
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
