import type {
  QueryCacheKey,
  QuerySubstateIdentifier,
  Subscribers,
  SubscribersInternal,
} from '../apiState'
import { QueryStatus } from '../apiState'
import type {
  QueryStateMeta,
  SubMiddlewareApi,
  TimeoutId,
  InternalHandlerBuilder,
  ApiMiddlewareInternalHandler,
  InternalMiddlewareState,
} from './types'

export const buildPollingHandler: InternalHandlerBuilder = ({
  reducerPath,
  queryThunk,
  api,
  refetchQuery,
  internalState,
}) => {
  const currentPolls: QueryStateMeta<{
    nextPollTimestamp: number
    timeout?: TimeoutId
    pollingInterval: number
  }> = {}

  const { currentSubscriptions } = internalState

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (
      api.internalActions.updateSubscriptionOptions.match(action) ||
      api.internalActions.unsubscribeQueryResult.match(action)
    ) {
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
  }

  function getCacheEntrySubscriptions(
    queryCacheKey: QueryCacheKey,
    api: SubMiddlewareApi,
  ) {
    const state = api.getState()[reducerPath]
    const querySubState = state.queries[queryCacheKey]
    const subscriptions = currentSubscriptions.get(queryCacheKey)

    if (!querySubState || querySubState.status === QueryStatus.uninitialized)
      return

    return subscriptions
  }

  function startNextPoll(
    { queryCacheKey }: QuerySubstateIdentifier,
    api: SubMiddlewareApi,
  ) {
    const state = api.getState()[reducerPath]
    const querySubState = state.queries[queryCacheKey]
    const subscriptions = currentSubscriptions.get(queryCacheKey)

    if (!querySubState || querySubState.status === QueryStatus.uninitialized)
      return

    const { lowestPollingInterval, skipPollingIfUnfocused } =
      findLowestPollingInterval(subscriptions)
    if (!Number.isFinite(lowestPollingInterval)) return

    const currentPoll = currentPolls[queryCacheKey]

    if (currentPoll?.timeout) {
      clearTimeout(currentPoll.timeout)
      currentPoll.timeout = undefined
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval

    currentPolls[queryCacheKey] = {
      nextPollTimestamp,
      pollingInterval: lowestPollingInterval,
      timeout: setTimeout(() => {
        if (state.config.focused || !skipPollingIfUnfocused) {
          api.dispatch(refetchQuery(querySubState))
        }
        startNextPoll({ queryCacheKey }, api)
      }, lowestPollingInterval),
    }
  }

  function updatePollingInterval(
    { queryCacheKey }: QuerySubstateIdentifier,
    api: SubMiddlewareApi,
  ) {
    const state = api.getState()[reducerPath]
    const querySubState = state.queries[queryCacheKey]
    const subscriptions = currentSubscriptions.get(queryCacheKey)

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) {
      return
    }

    const { lowestPollingInterval } = findLowestPollingInterval(subscriptions)

    if (!Number.isFinite(lowestPollingInterval)) {
      cleanupPollForKey(queryCacheKey)
      return
    }

    const currentPoll = currentPolls[queryCacheKey]
    const nextPollTimestamp = Date.now() + lowestPollingInterval

    if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
      startNextPoll({ queryCacheKey }, api)
    }
  }

  function cleanupPollForKey(key: string) {
    const existingPoll = currentPolls[key]
    if (existingPoll?.timeout) {
      clearTimeout(existingPoll.timeout)
    }
    delete currentPolls[key]
  }

  function clearPolls() {
    for (const key of Object.keys(currentPolls)) {
      cleanupPollForKey(key)
    }
  }

  function findLowestPollingInterval(
    subscribers: SubscribersInternal = new Map(),
  ) {
    let skipPollingIfUnfocused: boolean | undefined = false
    let lowestPollingInterval = Number.POSITIVE_INFINITY

    for (const entry of subscribers.values()) {
      if (!!entry.pollingInterval) {
        lowestPollingInterval = Math.min(
          entry.pollingInterval!,
          lowestPollingInterval,
        )
        skipPollingIfUnfocused =
          entry.skipPollingIfUnfocused || skipPollingIfUnfocused
      }
    }

    return {
      lowestPollingInterval,
      skipPollingIfUnfocused,
    }
  }

  return handler
}
