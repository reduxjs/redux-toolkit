import { getEndpointDefinition } from '@internal/query/apiTypes'
import type { QueryDefinition } from '../../endpointDefinitions'
import type { ConfigState, QueryCacheKey, QuerySubState } from '../apiState'
import { isAnyOf } from '../rtkImports'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
  SubMiddlewareApi,
} from './types'
import {
  clearRemovalTimer,
  releaseRetain,
  retainRecord,
  setRemovalTimer,
} from './runtime'

export type ReferenceCacheCollection = never

/**
 * @example
 * ```ts
 * // codeblock-meta title="keepUnusedDataFor example"
 * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
 * interface Post {
 *   id: number
 *   name: string
 * }
 * type PostsResponse = Post[]
 *
 * const api = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
 *   endpoints: (build) => ({
 *     getPosts: build.query<PostsResponse, void>({
 *       query: () => 'posts',
 *       // highlight-start
 *       keepUnusedDataFor: 5
 *       // highlight-end
 *     })
 *   })
 * })
 * ```
 */
export type CacheCollectionQueryExtraOptions = {
  /**
   * Overrides the api-wide definition of `keepUnusedDataFor` for this endpoint only. _(This value is in seconds.)_
   *
   * This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
   */
  keepUnusedDataFor?: number
}

// Per https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value , browsers store
// `setTimeout()` timer values in a 32-bit int. If we pass a value in that's larger than that,
// it wraps and ends up executing immediately.
// Our `keepUnusedDataFor` values are in seconds, so adjust the numbers here accordingly.
export const THIRTY_TWO_BIT_MAX_INT = 2_147_483_647
export const THIRTY_TWO_BIT_MAX_TIMER_SECONDS = 2_147_483_647 / 1_000 - 1

export const buildCacheCollectionHandler: InternalHandlerBuilder = ({
  reducerPath,
  api,
  queryThunk,
  context,
  runtime,
  selectors: { selectQueryEntry, selectConfig },
  mwApi,
}) => {
  const { removeQueryResult, unsubscribeQueryResult, cacheEntriesUpserted } =
    api.internalActions

  // A `condition`-based rejection means the query bailed out before it ever ran
  // (e.g. `initiate(arg, { subscribe: false })` served fresh cached data). Nothing
  // was fetched and no subscription changed, so we must not treat it as an
  // unsubscribe trigger: rescheduling the removal timer here resets
  // `keepUnusedDataFor` on every such call and prevents unused data from ever
  // being collected. See https://github.com/reduxjs/redux-toolkit/issues/4480
  const isQueryThunkRejectedByError = (
    action: any,
  ): action is ReturnType<typeof queryThunk.rejected> =>
    queryThunk.rejected.match(action) && !action.meta.condition

  const canTriggerUnsubscribe = isAnyOf(
    unsubscribeQueryResult.match,
    queryThunk.fulfilled,
    isQueryThunkRejectedByError,
    cacheEntriesUpserted.match,
  )

  function anySubscriptionsRemainingForKey(queryCacheKey: string) {
    return !!runtime.queries.get(queryCacheKey)?.subscribers?.size
  }

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    const state = mwApi.getState()
    const config = selectConfig(state)

    if (
      (queryThunk.pending.match(action) ||
        (queryThunk.rejected.match(action) && action.meta.condition)) &&
      action.meta.arg.retainFor
    ) {
      const { queryCacheKey, retainFor } = action.meta.arg
      if (selectQueryEntry(state, queryCacheKey)) {
        retainRecord(runtime, queryCacheKey, retainFor)
        if (runtime.queries.get(queryCacheKey)?.request) {
          // The running request's `fulfilled`/`rejected` arms the timer with
          // the new duration; an older timer must not remove it mid-flight
          clearRemovalTimer(runtime, queryCacheKey)
        } else {
          handleUnsubscribeMany([queryCacheKey], mwApi, config)
        }
      }
    }

    if (canTriggerUnsubscribe(action)) {
      let queryCacheKeys: QueryCacheKey[]

      if (cacheEntriesUpserted.match(action)) {
        queryCacheKeys = action.payload.map(
          (entry) => entry.queryDescription.queryCacheKey,
        )
      } else {
        const { queryCacheKey } = unsubscribeQueryResult.match(action)
          ? action.payload
          : action.meta.arg
        queryCacheKeys = [queryCacheKey]
      }

      handleUnsubscribeMany(queryCacheKeys, mwApi, config)
    }

    if (context.hasRehydrationInfo(action)) {
      const { queries } = context.extractRehydrationInfo(action)!
      // Gotcha:
      // If rehydrating before the endpoint has been injected,the global `keepUnusedDataFor`
      // will be used instead of the endpoint-specific one.
      handleUnsubscribeMany(
        Object.keys(queries) as QueryCacheKey[],
        mwApi,
        config,
      )
    }
  }

  function handleUnsubscribeMany(
    cacheKeys: QueryCacheKey[],
    api: SubMiddlewareApi,
    config: ConfigState<string>,
  ) {
    const state = api.getState()
    for (const queryCacheKey of cacheKeys) {
      const entry = selectQueryEntry(state, queryCacheKey)
      if (entry?.endpointName) {
        handleUnsubscribe(queryCacheKey, entry.endpointName, api, config)
      }
    }
  }

  function handleUnsubscribe(
    queryCacheKey: QueryCacheKey,
    endpointName: string,
    api: SubMiddlewareApi,
    config: ConfigState<string>,
  ) {
    const endpointDefinition = getEndpointDefinition(
      context,
      endpointName,
    ) as QueryDefinition<any, any, any, any>
    const configuredKeepUnusedDataFor =
      endpointDefinition?.keepUnusedDataFor ?? config.keepUnusedDataFor
    const keepUnusedDataFor = Math.max(
      configuredKeepUnusedDataFor,
      runtime.queries.get(queryCacheKey)?.retainFor ?? 0,
    )

    if (keepUnusedDataFor === Infinity) {
      // Hey, user said keep this forever!
      clearRemovalTimer(runtime, queryCacheKey)
      if (configuredKeepUnusedDataFor === Infinity) {
        releaseRetain(runtime, queryCacheKey)
      }
      return
    }
    // Prevent `setTimeout` timers from overflowing a 32-bit internal int, by
    // clamping the max value to be at most 1000ms less than the 32-bit max.
    // Look, a 24.8-day keepalive ought to be enough for anybody, right? :)
    // Also avoid negative values too.
    const finalKeepUnusedDataFor = Math.max(
      0,
      Math.min(keepUnusedDataFor, THIRTY_TWO_BIT_MAX_TIMER_SECONDS),
    )

    if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
      const timer = setTimeout(() => {
        clearRemovalTimer(runtime, queryCacheKey)
        if (!anySubscriptionsRemainingForKey(queryCacheKey)) {
          // Removing the entry also aborts a running request for it
          api.dispatch(removeQueryResult({ queryCacheKey }))
        }
      }, finalKeepUnusedDataFor * 1000)
      setRemovalTimer(runtime, queryCacheKey, timer)
    }
  }

  return handler
}
