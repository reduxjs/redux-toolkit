import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type {
  EndpointDefinitions,
  InfiniteQueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  QueryDefinition,
  ReducerPathFrom,
  TagDescription,
  TagTypesFrom,
} from '../endpointDefinitions'
import { expandTagDescription } from '../endpointDefinitions'
import { flatten, isNotNullish } from '../utils'
import type {
  InfiniteQuerySubState,
  MutationSubState,
  QueryCacheKey,
  QueryKeys,
  QueryState,
  QuerySubState,
  RequestStatusFlags,
  RootState as _RootState,
} from './apiState'
import { QueryStatus, getRequestStatusFlags } from './apiState'
import { getMutationCacheKey } from './buildSlice'
import type { createSelector as _createSelector } from './rtkImports'
import { createNextState } from './rtkImports'

export type SkipToken = typeof skipToken
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
 * // codeblock-meta title="using skipToken instead" no-transpile
 * useSomeQuery(arg ?? skipToken)
 * ```
 *
 * If passed directly into a query or mutation selector, that selector will always
 * return an uninitialized state.
 */
export const skipToken = /* @__PURE__ */ Symbol.for('RTKQ/skipToken')

export type BuildSelectorsApiEndpointQuery<
  Definition extends QueryDefinition<any, any, any, any, any>,
  Definitions extends EndpointDefinitions,
> = {
  select: QueryResultSelectorFactory<
    Definition,
    _RootState<
      Definitions,
      TagTypesFrom<Definition>,
      ReducerPathFrom<Definition>
    >
  >
}

export type ApiEndpointInfiniteQuery<
  Definition extends InfiniteQueryDefinition<any, any, any, any, any>,
  Definitions extends EndpointDefinitions,
> = {
  select: InfiniteQueryResultSelectorFactory<
    Definition,
    _RootState<
      Definitions,
      TagTypesFrom<Definition>,
      ReducerPathFrom<Definition>
    >
  >
}

export type BuildSelectorsApiEndpointMutation<
  Definition extends MutationDefinition<any, any, any, any, any>,
  Definitions extends EndpointDefinitions,
> = {
  select: MutationResultSelectorFactory<
    Definition,
    _RootState<
      Definitions,
      TagTypesFrom<Definition>,
      ReducerPathFrom<Definition>
    >
  >
}

type QueryResultSelectorFactory<
  Definition extends QueryDefinition<any, any, any, any>,
  RootState,
> = (
  queryArg: QueryArgFrom<Definition> | SkipToken,
) => (state: RootState) => QueryResultSelectorResult<Definition>

export type QueryResultSelectorResult<
  Definition extends QueryDefinition<any, any, any, any>,
> = QuerySubState<Definition> & RequestStatusFlags

type InfiniteQueryResultSelectorFactory<
  Definition extends InfiniteQueryDefinition<any, any, any, any>,
  RootState,
> = (
  queryArg: QueryArgFrom<Definition> | SkipToken,
) => (state: RootState) => InfiniteQueryResultSelectorResult<Definition>

export type InfiniteQueryResultSelectorResult<
  Definition extends InfiniteQueryDefinition<any, any, any, any>,
> = InfiniteQuerySubState<Definition> & RequestStatusFlags

type MutationResultSelectorFactory<
  Definition extends MutationDefinition<any, any, any, any>,
  RootState,
> = (
  requestId:
    | string
    | { requestId: string | undefined; fixedCacheKey: string | undefined }
    | SkipToken,
) => (state: RootState) => MutationResultSelectorResult<Definition>

export type MutationResultSelectorResult<
  Definition extends MutationDefinition<any, any, any, any>,
> = MutationSubState<Definition> & RequestStatusFlags

const initialSubState: QuerySubState<any> = {
  status: QueryStatus.uninitialized as const,
}

// abuse immer to freeze default states
const defaultQuerySubState = /* @__PURE__ */ createNextState(
  initialSubState,
  () => {},
)
const defaultMutationSubState = /* @__PURE__ */ createNextState(
  initialSubState as MutationSubState<any>,
  () => {},
)

export function buildSelectors<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
>({
  serializeQueryArgs,
  reducerPath,
  createSelector,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs
  reducerPath: ReducerPath
  createSelector: typeof _createSelector
}) {
  type RootState = _RootState<Definitions, string, string>

  const selectSkippedQuery = (state: RootState) => defaultQuerySubState
  const selectSkippedMutation = (state: RootState) => defaultMutationSubState

  return {
    buildQuerySelector,
    buildInfiniteQuerySelector,
    buildMutationSelector,
    selectInvalidatedBy,
    selectCachedArgsForQuery,
  }

  function withRequestFlags<T extends { status: QueryStatus }>(
    substate: T,
  ): T & RequestStatusFlags {
    return {
      ...substate,
      ...getRequestStatusFlags(substate.status),
    }
  }

  function selectInternalState(rootState: RootState) {
    const state = rootState[reducerPath]
    if (process.env.NODE_ENV !== 'production') {
      if (!state) {
        if ((selectInternalState as any).triggered) return state
        ;(selectInternalState as any).triggered = true
        console.error(
          `Error: No data found at \`state.${reducerPath}\`. Did you forget to add the reducer to the store?`,
        )
      }
    }
    return state
  }

  function buildQuerySelector(
    endpointName: string,
    endpointDefinition: QueryDefinition<any, any, any, any>,
  ) {
    return ((queryArgs: any) => {
      if (queryArgs === skipToken) {
        return createSelector(selectSkippedQuery, withRequestFlags)
      }
      const serializedArgs = serializeQueryArgs({
        queryArgs,
        endpointDefinition,
        endpointName,
      })
      const selectQuerySubstate = (state: RootState) =>
        selectInternalState(state)?.queries?.[serializedArgs] ??
        defaultQuerySubState

      return createSelector(selectQuerySubstate, withRequestFlags)
    }) as QueryResultSelectorFactory<any, RootState>
  }

  // Selector will merge all existing entries in the cache and return the result
  // selector currently is just a clone of Query though
  function buildInfiniteQuerySelector(
    endpointName: string,
    endpointDefinition: InfiniteQueryDefinition<any, any, any, any>,
  ) {
    return ((queryArgs: any) => {
      const serializedArgs = serializeQueryArgs({
        queryArgs,
        endpointDefinition,
        endpointName,
      })
      const selectQuerySubstate = (state: RootState) =>
        selectInternalState(state)?.queries?.[serializedArgs] ??
        defaultQuerySubState
      const finalSelectQuerySubState =
        queryArgs === skipToken ? selectSkippedQuery : selectQuerySubstate

      return createSelector(finalSelectQuerySubState, withRequestFlags)
    }) as QueryResultSelectorFactory<any, RootState>
  }

  function buildMutationSelector() {
    return ((id) => {
      let mutationId: string | typeof skipToken
      if (typeof id === 'object') {
        mutationId = getMutationCacheKey(id) ?? skipToken
      } else {
        mutationId = id
      }
      const selectMutationSubstate = (state: RootState) =>
        selectInternalState(state)?.mutations?.[mutationId as string] ??
        defaultMutationSubState
      const finalSelectMutationSubstate =
        mutationId === skipToken
          ? selectSkippedMutation
          : selectMutationSubstate

      return createSelector(finalSelectMutationSubstate, withRequestFlags)
    }) as MutationResultSelectorFactory<any, RootState>
  }

  function selectInvalidatedBy(
    state: RootState,
    tags: ReadonlyArray<TagDescription<string> | null | undefined>,
  ): Array<{
    endpointName: string
    originalArgs: any
    queryCacheKey: QueryCacheKey
  }> {
    const apiState = state[reducerPath]
    const toInvalidate = new Set<QueryCacheKey>()
    for (const tag of tags.filter(isNotNullish).map(expandTagDescription)) {
      const provided = apiState.provided[tag.type]
      if (!provided) {
        continue
      }

      let invalidateSubscriptions =
        (tag.id !== undefined
          ? // id given: invalidate all queries that provide this type & id
            provided[tag.id]
          : // no id: invalidate all queries that provide this type
            flatten(Object.values(provided))) ?? []

      for (const invalidate of invalidateSubscriptions) {
        toInvalidate.add(invalidate)
      }
    }

    return flatten(
      Array.from(toInvalidate.values()).map((queryCacheKey) => {
        const querySubState = apiState.queries[queryCacheKey]
        return querySubState
          ? [
              {
                queryCacheKey,
                endpointName: querySubState.endpointName!,
                originalArgs: querySubState.originalArgs,
              },
            ]
          : []
      }),
    )
  }

  function selectCachedArgsForQuery<QueryName extends QueryKeys<Definitions>>(
    state: RootState,
    queryName: QueryName,
  ): Array<QueryArgFrom<Definitions[QueryName]>> {
    return Object.values(state[reducerPath].queries as QueryState<any>)
      .filter(
        (
          entry,
        ): entry is Exclude<
          QuerySubState<Definitions[QueryName]>,
          { status: QueryStatus.uninitialized }
        > =>
          entry?.endpointName === queryName &&
          entry.status !== QueryStatus.uninitialized,
      )
      .map((entry) => entry.originalArgs)
  }
}
