import { createNextState, createSelector } from '@reduxjs/toolkit'
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RootState as _RootState,
  getRequestStatusFlags,
  RequestStatusFlags,
} from './apiState'
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  TagTypesFrom,
  ReducerPathFrom,
} from '../endpointDefinitions'
import { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'

export type SkipSymbol = typeof skipSymbol
/**
 * Can be passed into `useQuery`, `useQueryState` or `useQuerySubscription`
 * instead of the query argument to get the same effect as if setting
 * `skip: true` in the query options.
 *
 * Useful for scenarios where a query should be skipped when `arg` is `undefined`
 * and TypeScript complains about it because `arg` is not allowed to be passed
 * in as `undefined`, such as
 *
 * ```ts
 * // codeblock-meta title="will error if the query argument is not allowed to be undefined" no-transpile
 * useSomeQuery(arg, { skip: !!arg })
 * ```
 *
 * ```ts
 * // codeblock-meta title="using skipSymbol instead" no-transpile
 * useSomeQuery(arg ?? skipSymbol)
 * ```
 *
 * If passed directly into a query or mutation selector, that selector will always
 * return an uninitialized state.
 */
export const skipSymbol = Symbol('skip selector')
/** @deprecated renamed to `skipSymbol` */
export const skipSelector = skipSymbol

declare module './module' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    select: QueryResultSelectorFactory<
      Definition,
      _RootState<
        Definitions,
        TagTypesFrom<Definition>,
        ReducerPathFrom<Definition>
      >
    >
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    select: MutationResultSelectorFactory<
      Definition,
      _RootState<
        Definitions,
        TagTypesFrom<Definition>,
        ReducerPathFrom<Definition>
      >
    >
  }
}

type QueryResultSelectorFactory<
  Definition extends QueryDefinition<any, any, any, any>,
  RootState
> = (
  queryArg: QueryArgFrom<Definition> | SkipSymbol
) => (state: RootState) => QueryResultSelectorResult<Definition>

export type QueryResultSelectorResult<
  Definition extends QueryDefinition<any, any, any, any>
> = QuerySubState<Definition> & RequestStatusFlags

type MutationResultSelectorFactory<
  Definition extends MutationDefinition<any, any, any, any>,
  RootState
> = (
  requestId: string | SkipSymbol
) => (state: RootState) => MutationResultSelectorResult<Definition>

export type MutationResultSelectorResult<
  Definition extends MutationDefinition<any, any, any, any>
> = MutationSubState<Definition> & RequestStatusFlags

const initialSubState: QuerySubState<any> = {
  status: QueryStatus.uninitialized as const,
}

// abuse immer to freeze default states
const defaultQuerySubState = createNextState(initialSubState, () => {})
const defaultMutationSubState = createNextState(
  initialSubState as MutationSubState<any>,
  () => {}
)

export function buildSelectors<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string
>({
  serializeQueryArgs,
  reducerPath,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs
  reducerPath: ReducerPath
}) {
  type RootState = _RootState<Definitions, string, string>

  return { buildQuerySelector, buildMutationSelector }

  function withRequestFlags<T extends { status: QueryStatus }>(
    substate: T
  ): T & RequestStatusFlags {
    return {
      ...substate,
      ...getRequestStatusFlags(substate.status),
    }
  }

  function selectInternalState(rootState: RootState) {
    return rootState[reducerPath]
  }

  function buildQuerySelector(
    endpointName: string,
    endpointDefinition: QueryDefinition<any, any, any, any>
  ): QueryResultSelectorFactory<any, RootState> {
    return (queryArgs) => {
      const selectQuerySubState = createSelector(
        selectInternalState,
        (internalState) =>
          (queryArgs === skipSymbol
            ? undefined
            : internalState.queries[
                serializeQueryArgs({
                  queryArgs,
                  endpointDefinition,
                  endpointName,
                })
              ]) ?? defaultQuerySubState
      )
      return createSelector(selectQuerySubState, withRequestFlags)
    }
  }

  function buildMutationSelector(): MutationResultSelectorFactory<
    any,
    RootState
  > {
    return (mutationId) => {
      const selectMutationSubstate = createSelector(
        selectInternalState,
        (internalState) =>
          (mutationId === skipSymbol
            ? undefined
            : internalState.mutations[mutationId]) ?? defaultMutationSubState
      )
      return createSelector(selectMutationSubstate, withRequestFlags)
    }
  }
}
