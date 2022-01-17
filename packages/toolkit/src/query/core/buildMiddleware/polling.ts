import type { QuerySubstateIdentifier, Subscribers } from '../apiState'
import { QueryStatus } from '../apiState'
import type {
  QueryStateMeta,
  SubMiddlewareApi,
  SubMiddlewareBuilder,
  TimeoutId,
} from './types'

export const build: SubMiddlewareBuilder = ({
  reducerPath,
  queryThunk,
  api,
  refetchQuery,
}) => {
  return (mwApi) => {
    const currentPolls: QueryStateMeta<{
      nextPollTimestamp: number
      timeout?: TimeoutId
      pollingInterval: number
    }> = {}

    return (next) =>
      (action): any => {
        const result = next(action)

        if (api.internalActions.unsubscribeQueryResult.match(action)) {
          const { queryCacheKey } = action.payload
          const existingSubscriptionCount = Object.keys(
            mwApi.getState()[reducerPath].subscriptions[queryCacheKey] || {}
          ).length

          // There are no other components subscribed and sharing a poll for this queryCacheKey, so we can
          // safely remove it
          if (existingSubscriptionCount === 0) {
            cleanupPollForKey(queryCacheKey)
          }
        }

        if (api.internalActions.updateSubscriptionOptions.match(action)) {
          updatePollingInterval(action.payload, mwApi)
        }

        if (
          queryThunk.pending.match(action) ||
          (queryThunk.rejected.match(action) && action.meta.condition)
        ) {
          updatePollingInterval(action.meta.arg, mwApi)
        }

        if (
          queryThunk.fulfilled.match(action) ||
          (queryThunk.rejected.match(action) && !action.meta.condition)
        ) {
          startNextPoll(action.meta.arg, mwApi)
        }

        if (api.util.resetApiState.match(action)) {
          clearPolls()
        }

        return result
      }

    function startNextPoll(
      { queryCacheKey }: QuerySubstateIdentifier,
      api: SubMiddlewareApi
    ) {
      const state = api.getState()[reducerPath]
      const querySubState = state.queries[queryCacheKey]
      const subscriptions = state.subscriptions[queryCacheKey]

      if (!querySubState || querySubState.status === QueryStatus.uninitialized)
        return

      const lowestPollingInterval = findLowestPollingInterval(subscriptions)
      if (!Number.isFinite(lowestPollingInterval)) return

      const currentPoll = currentPolls[queryCacheKey]

      if (currentPoll?.timeout) {
        clearTimeout(currentPoll.timeout)
        currentPoll.timeout = undefined
      }

      const nextPollTimestamp = Date.now() + lowestPollingInterval

      const currentInterval: typeof currentPolls[number] = (currentPolls[
        queryCacheKey
      ] = {
        nextPollTimestamp,
        pollingInterval: lowestPollingInterval,
        timeout: setTimeout(() => {
          currentInterval!.timeout = undefined
          api.dispatch(refetchQuery(querySubState, queryCacheKey))
        }, lowestPollingInterval),
      })
    }

    function updatePollingInterval(
      { queryCacheKey }: QuerySubstateIdentifier,
      api: SubMiddlewareApi
    ) {
      const state = api.getState()[reducerPath]
      const querySubState = state.queries[queryCacheKey]
      const subscriptions = state.subscriptions[queryCacheKey]

      if (
        !querySubState ||
        querySubState.status === QueryStatus.uninitialized
      ) {
        return
      }

      const lowestPollingInterval = findLowestPollingInterval(subscriptions)
      const currentPoll = currentPolls[queryCacheKey]

      if (!Number.isFinite(lowestPollingInterval)) {
        cleanupPollForKey(queryCacheKey)
        return
      }

      const nextPollTimestamp = Date.now() + lowestPollingInterval

      if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
        startNextPoll({ queryCacheKey }, api)
      }
    }

    function cleanupPollForKey(key: string) {
      const existingPoll = currentPolls[key]
      existingPoll?.timeout && clearTimeout(existingPoll.timeout)
      delete currentPolls[key]
    }

    function clearPolls() {
      for (const key of Object.keys(currentPolls)) {
        cleanupPollForKey(key)
      }
    }
  }

  function findLowestPollingInterval(subscribers: Subscribers = {}) {
    let lowestPollingInterval = Number.POSITIVE_INFINITY
    for (const subscription of Object.values(subscribers)) {
      if (!!subscription.pollingInterval)
        lowestPollingInterval = Math.min(
          subscription.pollingInterval,
          lowestPollingInterval
        )
    }
    return lowestPollingInterval
  }
}
