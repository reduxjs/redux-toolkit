import type { BaseQueryFn } from '../../baseQueryTypes'
import type { QueryDefinition } from '../../endpointDefinitions'
import type { ConfigState, QueryCacheKey } from '../apiState'
import { QuerySubstateIdentifier } from '../apiState'
import type { PrefetchSubscribriptionOptions } from '../buildInitiate'
import type {
  QueryStateMeta,
  SubMiddlewareApi,
  SubMiddlewareBuilder,
  TimeoutId,
} from './types'

export type ReferenceCacheCollection = never

declare module '../../endpointDefinitions' {
  interface QueryExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    /**
     * Overrides the api-wide definition of `keepUnusedDataFor` for this endpoint only. _(This value is in seconds.)_
     *
     * This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
     */
    keepUnusedDataFor?: number
  }
}

/**
 * Output is in *milliseconds*.
 */
const getPrefetchSubscriptionTTLMs = (
  prefetch: true | PrefetchSubscribriptionOptions,
  config: ConfigState<string>
): number => {
  if (
    typeof prefetch === 'object' &&
    prefetch !== null &&
    typeof prefetch.keepSubscriptionFor === 'number'
  ) {
    return prefetch.keepSubscriptionFor * 1000
  }

  return config.keepPrefetchSubscriptionsFor * 1000
}

export const build: SubMiddlewareBuilder = ({
  reducerPath,
  api,
  context,
  queryThunk,
}) => {
  const { removeQueryResult, unsubscribeQueryResult } = api.internalActions

  return (mwApi) => {
    const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {}
    const autoUnsubscribeTimeouts: QueryStateMeta<TimeoutId> = {}

    return (next) =>
      (action): any => {
        const result = next(action)

        if (unsubscribeQueryResult.match(action)) {
          const state = mwApi.getState()[reducerPath]
          const { queryCacheKey } = action.payload

          handleUnsubscribe(
            queryCacheKey,
            state.queries[queryCacheKey]?.endpointName,
            mwApi,
            state.config
          )
        }

        if (queryThunk.pending.match(action) && action.meta.arg.prefetch) {
          const requestId = action.meta.requestId
          const currentTimeout = autoUnsubscribeTimeouts[requestId]

          if (currentTimeout) {
            clearTimeout(currentTimeout)
          }

          autoUnsubscribeTimeouts[requestId] = setTimeout(
            mwApi.dispatch,
            getPrefetchSubscriptionTTLMs(
              action.meta.arg.prefetch,
              mwApi.getState()[reducerPath].config
            ),
            unsubscribeQueryResult({
              requestId,
              queryCacheKey: action.meta.arg.queryCacheKey,
            })
          )
        }

        if (api.util.resetApiState.match(action)) {
          for (const [key, timeout] of Object.entries(
            currentRemovalTimeouts
          ).concat(Object.entries(autoUnsubscribeTimeouts))) {
            if (timeout) clearTimeout(timeout)
            delete currentRemovalTimeouts[key]
          }
        }

        if (context.hasRehydrationInfo(action)) {
          const state = mwApi.getState()[reducerPath]
          const { queries } = context.extractRehydrationInfo(action)!
          for (const [queryCacheKey, queryState] of Object.entries(queries)) {
            // Gotcha:
            // If rehydrating before the endpoint has been injected,the global `keepUnusedDataFor`
            // will be used instead of the endpoint-specific one.
            handleUnsubscribe(
              queryCacheKey as QueryCacheKey,
              queryState?.endpointName,
              mwApi,
              state.config
            )
          }
        }

        return result
      }

    function handleUnsubscribe(
      queryCacheKey: QueryCacheKey,
      endpointName: string | undefined,
      api: SubMiddlewareApi,
      config: ConfigState<string>
    ) {
      const endpointDefinition = context.endpointDefinitions[
        endpointName!
      ] as QueryDefinition<any, any, any, any>
      const keepUnusedDataFor =
        endpointDefinition?.keepUnusedDataFor ?? config.keepUnusedDataFor

      const currentTimeout = currentRemovalTimeouts[queryCacheKey]
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
      currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
        const subscriptions =
          api.getState()[reducerPath].subscriptions[queryCacheKey]
        if (!subscriptions || Object.keys(subscriptions).length === 0) {
          api.dispatch(removeQueryResult({ queryCacheKey }))
        }
        delete currentRemovalTimeouts![queryCacheKey]
      }, keepUnusedDataFor * 1000)
    }
  }
}
