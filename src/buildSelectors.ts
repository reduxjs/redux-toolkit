import { createNextState } from '@reduxjs/toolkit';
import { MutationSubState, QueryStatus, QuerySubState, RootState as _RootState } from './apiState';
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
    ? (queryArg: QueryArg | typeof skipSelector) => (state: RootState) => QuerySubState<Definitions[K]>
    : never;
};

export type MutationResultSelectors<Definitions extends EndpointDefinitions, RootState> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, infer ResultType>
    ? (requestId: string | typeof skipSelector) => (state: RootState) => MutationSubState<Definitions[K]>
    : never;
};

export type QueryResultSelector<Definition extends QueryDefinition<any, any, any, any>, RootState> = (
  queryArg: QueryArgFrom<Definition> | typeof skipSelector
) => (state: RootState) => QuerySubState<Definition>;
export type MutationResultSelector<Definition extends MutationDefinition<any, any, any, any>, RootState> = (
  requestId: string | typeof skipSelector
) => (state: RootState) => MutationSubState<Definition>;

// abuse immer to freeze default states
const defaultQuerySubState = createNextState(
  {},
  (): QuerySubState<any> => {
    return {
      status: QueryStatus.uninitialized,
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

export function buildSelectors<InternalQueryArgs, Definitions extends EndpointDefinitions, ReducerPath extends string>({
  serializeQueryArgs,
  reducerPath,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  reducerPath: ReducerPath;
}) {
  type RootState = _RootState<Definitions, string, ReducerPath>;

  return { buildQuerySelector, buildMutationSelector };

  function buildQuerySelector(
    endpoint: string,
    definition: QueryDefinition<any, any, any, any>
  ): QueryResultSelector<any, RootState> {
    return (arg?) => (rootState: RootState) =>
      (arg === skipSelector
        ? undefined
        : (rootState[reducerPath] as InternalState).queries[serializeQueryArgs(definition.query(arg), endpoint)]) ??
      defaultQuerySubState;
  }

  function buildMutationSelector(
    endpoint: string,
    definition: MutationDefinition<any, any, any, any>
  ): MutationResultSelector<any, RootState> {
    return (mutationId) => (rootState) =>
      (mutationId === skipSelector ? undefined : rootState[reducerPath].mutations[mutationId]) ??
      defaultMutationSubState;
  }
}
