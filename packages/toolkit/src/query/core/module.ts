/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit'
import { enablePatches } from 'immer'
import type { Api, Module } from '../apiTypes'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type {
  AssertTagTypes,
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  ReducerPathFrom,
  TagTypesFrom,
} from '../endpointDefinitions'
import { isMutationDefinition, isQueryDefinition } from '../endpointDefinitions'
import { assertCast, safeAssign } from '../tsHelpers'
import type { RootState } from './apiState'
import type {
  StartMutationActionCreator,
  StartQueryActionCreator,
} from './buildInitiate'
import { buildInitiate } from './buildInitiate'
import type {
  ReferenceCacheCollection,
  ReferenceCacheLifecycle,
  ReferenceQueryLifecycle,
} from './buildMiddleware'
import { buildMiddleware } from './buildMiddleware'
import type {
  MutationResultSelectorFactory,
  QueryResultSelectorFactory,
} from './buildSelectors'
import { buildSelectors } from './buildSelectors'
import type { SliceActions } from './buildSlice'
import { buildSlice } from './buildSlice'
import type { Matchers, MutationThunk, QueryThunk } from './buildThunks'
import { buildThunks } from './buildThunks'
import { createSelector as _createSelector } from './rtkImports'
import { onFocus, onFocusLost, onOffline, onOnline } from './setupListeners'

/**
 * `ifOlderThan` - (default: `false` | `number`) - _number is value in seconds_
 * - If specified, it will only run the query if the difference between `new Date()` and the last `fulfilledTimeStamp` is greater than the given value
 *
 * @overloadSummary
 * `force`
 * - If `force: true`, it will ignore the `ifOlderThan` value if it is set and the query will be run even if it exists in the cache.
 */
export type PrefetchOptions =
  | {
      ifOlderThan?: false | number
    }
  | { force?: boolean }

export const coreModuleName = /* @__PURE__ */ Symbol()
export type CoreModule =
  | typeof coreModuleName
  | ReferenceCacheLifecycle
  | ReferenceQueryLifecycle
  | ReferenceCacheCollection

export type ThunkWithReturnValue<T> = ThunkAction<T, any, any, UnknownAction>

export interface ApiEndpointQuery<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends QueryDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
> extends Matchers<QueryThunk, Definition> {
  initiate: StartQueryActionCreator<Definition>

  select: QueryResultSelectorFactory<
    Definition,
    RootState<
      Definitions,
      TagTypesFrom<Definition>,
      ReducerPathFrom<Definition>
    >
  >

  name: string
  /**
   * All of these are `undefined` at runtime, purely to be used in TypeScript declarations!
   */
  Types: NonNullable<Definition['Types']>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiEndpointMutation<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends MutationDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
> extends Matchers<MutationThunk, Definition> {
  initiate: StartMutationActionCreator<Definition>

  select: MutationResultSelectorFactory<
    Definition,
    RootState<
      Definitions,
      TagTypesFrom<Definition>,
      ReducerPathFrom<Definition>
    >
  >

  name: string
  /**
   * All of these are `undefined` at runtime, purely to be used in TypeScript declarations!
   */
  Types: NonNullable<Definition['Types']>
}

export type ListenerActions = {
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onOnline: typeof onOnline
  onOffline: typeof onOffline
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onFocus: typeof onFocus
  onFocusLost: typeof onFocusLost
}

export type InternalActions = SliceActions & ListenerActions

export interface CoreModuleOptions {
  /**
   * A selector creator (usually from `reselect`, or matching the same signature)
   */
  createSelector?: typeof _createSelector
}

/**
 * Creates a module containing the basic redux logic for use with `buildCreateApi`.
 *
 * @example
 * ```ts
 * const createBaseApi = buildCreateApi(coreModule());
 * ```
 */
export const coreModule = ({
  createSelector = _createSelector,
}: CoreModuleOptions = {}): Module<CoreModule> => ({
  name: coreModuleName,
  init(
    api,
    {
      baseQuery,
      tagTypes,
      reducerPath,
      serializeQueryArgs,
      keepUnusedDataFor,
      refetchOnMountOrArgChange,
      refetchOnFocus,
      refetchOnReconnect,
      invalidationBehavior,
    },
    context,
  ) {
    enablePatches()

    assertCast<InternalSerializeQueryArgs>(serializeQueryArgs)

    const assertTagType: AssertTagTypes = (tag) => {
      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development'
      ) {
        if (!tagTypes.includes(tag.type as any)) {
          console.error(
            `Tag type '${tag.type}' was used, but not specified in \`tagTypes\`!`,
          )
        }
      }
      return tag
    }

    Object.assign(api, {
      reducerPath,
      endpoints: {},
      internalActions: {
        onOnline,
        onOffline,
        onFocus,
        onFocusLost,
      },
      util: {},
    })

    const {
      queryThunk,
      mutationThunk,
      patchQueryData,
      updateQueryData,
      upsertQueryData,
      prefetch,
      buildMatchThunkActions,
    } = buildThunks({
      baseQuery,
      reducerPath,
      context,
      api,
      serializeQueryArgs,
      assertTagType,
    })

    const { reducer, actions: sliceActions } = buildSlice({
      context,
      queryThunk,
      mutationThunk,
      reducerPath,
      assertTagType,
      config: {
        refetchOnFocus,
        refetchOnReconnect,
        refetchOnMountOrArgChange,
        keepUnusedDataFor,
        reducerPath,
        invalidationBehavior,
      },
    })

    safeAssign(api.util, {
      patchQueryData,
      updateQueryData,
      upsertQueryData,
      prefetch,
      resetApiState: sliceActions.resetApiState,
    })
    safeAssign(api.internalActions, sliceActions)

    const { middleware, actions: middlewareActions } = buildMiddleware({
      reducerPath,
      context,
      queryThunk,
      mutationThunk,
      api,
      assertTagType,
    })
    safeAssign(api.util, middlewareActions)

    safeAssign(api, { reducer: reducer as any, middleware })

    const {
      buildQuerySelector,
      buildMutationSelector,
      selectInvalidatedBy,
      selectCachedArgsForQuery,
    } = buildSelectors({
      serializeQueryArgs: serializeQueryArgs as any,
      reducerPath,
      createSelector,
    })

    safeAssign(api.util, { selectInvalidatedBy, selectCachedArgsForQuery })

    const {
      buildInitiateQuery,
      buildInitiateMutation,
      getRunningMutationThunk,
      getRunningMutationsThunk,
      getRunningQueriesThunk,
      getRunningQueryThunk,
    } = buildInitiate({
      queryThunk,
      mutationThunk,
      api,
      serializeQueryArgs: serializeQueryArgs as any,
      context,
    })

    safeAssign(api.util, {
      getRunningMutationThunk,
      getRunningMutationsThunk,
      getRunningQueryThunk,
      getRunningQueriesThunk,
    })

    return {
      name: coreModuleName,
      injectEndpoint(endpointName, definition) {
        const anyApi = api as any as Api<
          any,
          Record<string, any>,
          string,
          string,
          CoreModule
        >
        anyApi.endpoints[endpointName] ??= {} as any
        if (isQueryDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpointName],
            {
              name: endpointName,
              select: buildQuerySelector(endpointName, definition),
              initiate: buildInitiateQuery(endpointName, definition),
            },
            buildMatchThunkActions(queryThunk, endpointName),
          )
        } else if (isMutationDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpointName],
            {
              name: endpointName,
              select: buildMutationSelector(),
              initiate: buildInitiateMutation(endpointName),
            },
            buildMatchThunkActions(mutationThunk, endpointName),
          )
        }
      },
    }
  },
})
