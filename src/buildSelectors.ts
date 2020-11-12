import { createNextState } from '@reduxjs/toolkit';
import { MutationSubState, QueryStatus, QuerySubState, RootState as _RootState } from './apiState';
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from './endpointDefinitions';
import type { InternalState } from './buildSlice';
import { InternalSerializeQueryArgs } from '.';

export const skipSelector = Symbol('skip selector');

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
  endpointDefinitions,
  reducerPath,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  endpointDefinitions: Definitions;
  reducerPath: ReducerPath;
}) {
  type RootState = _RootState<Definitions, string, ReducerPath>;
  const querySelectors = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = (arg?) => (rootState) =>
        (arg === skipSelector
          ? undefined
          : (rootState[reducerPath] as InternalState).queries[serializeQueryArgs(endpoint.query(arg), name)]) ??
        defaultQuerySubState;
    }
    return acc;
  }, {} as Record<string, (arg: unknown) => (state: RootState) => unknown>) as QueryResultSelectors<
    Definitions,
    RootState
  >;

  const mutationSelectors = Object.entries(endpointDefinitions).reduce((acc, [name, endpoint]) => {
    if (isMutationDefinition(endpoint)) {
      acc[name] = (mutationId: string | typeof skipSelector) => (rootState) =>
        (mutationId === skipSelector ? undefined : rootState[reducerPath].mutations[mutationId]) ??
        defaultMutationSubState;
    }
    return acc;
  }, {} as Record<string, (arg: string) => (state: RootState) => unknown>) as MutationResultSelectors<
    Definitions,
    RootState
  >;
  return { querySelectors, mutationSelectors };
}
