import type {
  QueryCacheKey,
  QuerySubstateIdentifier,
  Subscribers,
  SubscribersInternal,
} from '../apiState'
import { STATUS_PENDING, STATUS_UNINITIALIZED } from '../apiState'
import { THIRTY_TWO_BIT_MAX_INT } from './cacheCollection'
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
  const { currentPolls, currentSubscriptions } = internalState

  // Batching state for polling updates
  const pendingPollingUpdates = new Set<string>()
  let pollingUpdateTimer: ReturnType<typeof setTimeout> | null = null

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (
      api.internalActions.updateSubscriptionOptions.match(action) ||
      api.internalActions.unsubscribeQueryResult.match(action)
    ) {
      schedulePollingUpdate(action.payload.queryCacheKey, mwApi)
    }

    if (
      queryThunk.pending.match(action) ||
      (queryThunk.rejected.match(action) && action.meta.condition)
    ) {
      schedulePollingUpdate(action.meta.arg.queryCacheKey, mwApi)
    }

    if (
      queryThunk.fulfilled.match(action) ||
      (queryThunk.rejected.match(action) && !action.meta.condition)
    ) {
      startNextPoll(action.meta.arg, mwApi)
    }

    if (api.internalActions.removeQueryResult.match(action)) {
      cleanupPollForKey(action.payload.queryCacheKey)
    }

    if (api.util.resetApiState.match(action)) {
      clearPolls()
      // Clear any pending updates
      if (pollingUpdateTimer) {
        clearTimeout(pollingUpdateTimer)
        pollingUpdateTimer = null
      }
      pendingPollingUpdates.clear()
    }
  }

  function schedulePollingUpdate(queryCacheKey: string, api: SubMiddlewareApi) {
    if (
      !currentPolls.has(queryCacheKey) &&
      !Number.isFinite(
        findLowestPollingInterval(currentSubscriptions.get(queryCacheKey))
          .lowestPollingInterval,
      )
    ) {
      return
    }
    pendingPollingUpdates.add(queryCacheKey)

    if (!pollingUpdateTimer) {
      pollingUpdateTimer = setTimeout(() => {
        // Process all pending updates in a single batch
        for (const key of pendingPollingUpdates) {
          updatePollingInterval({ queryCacheKey: key as any }, api)
        }
        pendingPollingUpdates.clear()
        pollingUpdateTimer = null
      }, 0)
    }
  }

  function startNextPoll(
    { queryCacheKey }: QuerySubstateIdentifier,
    api: SubMiddlewareApi,
    delay?: number,
  ) {
    const state = api.getState()[reducerPath]
    const querySubState = state.queries[queryCacheKey]
    const subscriptions = currentSubscriptions.get(queryCacheKey)

    const { lowestPollingInterval } = findLowestPollingInterval(subscriptions)

    if (
      !querySubState ||
      querySubState.status === STATUS_UNINITIALIZED ||
      !Number.isFinite(lowestPollingInterval)
    ) {
      cleanupPollForKey(queryCacheKey)
      return
    }

    const currentPoll = currentPolls.get(queryCacheKey)

    if (currentPoll?.timeout) {
      clearTimeout(currentPoll.timeout)
      currentPoll.timeout = undefined
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      lowestPollingInterval > THIRTY_TWO_BIT_MAX_INT
    ) {
      console.warn(
        `pollingInterval ${lowestPollingInterval} is larger than the maximum timer delay. Using ${THIRTY_TWO_BIT_MAX_INT} instead.`,
      )
    }
    const pollingInterval = Math.min(
      lowestPollingInterval,
      THIRTY_TWO_BIT_MAX_INT,
    )
    const timeoutMs = delay ?? pollingInterval
    const nextPollTimestamp = Date.now() + timeoutMs

    currentPolls.set(queryCacheKey, {
      nextPollTimestamp,
      pollingInterval,
      timeout: setTimeout(() => {
        const currentState = api.getState()[reducerPath]
        const currentQuerySubState = currentState.queries[queryCacheKey]
        // The subscription map and cache entry may have changed since this
        // poll was scheduled, because unsubscribe cleanup is deferred.
        const {
          lowestPollingInterval: currentPollingInterval,
          skipPollingIfUnfocused,
        } = findLowestPollingInterval(currentSubscriptions.get(queryCacheKey))
        if (
          !currentQuerySubState ||
          currentQuerySubState.status === STATUS_UNINITIALIZED ||
          !Number.isFinite(currentPollingInterval)
        ) {
          cleanupPollForKey(queryCacheKey)
          return
        }
        // The pending request's `fulfilled` or `rejected` action starts the next poll
        if (currentQuerySubState.status === STATUS_PENDING) {
          cleanupPollForKey(queryCacheKey)
          return
        }
        if (currentState.config.focused || !skipPollingIfUnfocused) {
          api.dispatch(refetchQuery(currentQuerySubState))
        }
        startNextPoll({ queryCacheKey }, api)
      }, timeoutMs),
    })
  }

  function updatePollingInterval(
    { queryCacheKey }: QuerySubstateIdentifier,
    api: SubMiddlewareApi,
  ) {
    const state = api.getState()[reducerPath]
    const querySubState = state.queries[queryCacheKey]
    const subscriptions = currentSubscriptions.get(queryCacheKey)

    if (!querySubState || querySubState.status === STATUS_UNINITIALIZED) {
      return
    }

    const { lowestPollingInterval } = findLowestPollingInterval(subscriptions)

    if (process.env.NODE_ENV === 'test') {
      const updateCounters = (internalState.pollUpdateCounters ??= {})
      updateCounters[queryCacheKey] = (updateCounters[queryCacheKey] ?? 0) + 1
    }

    if (!Number.isFinite(lowestPollingInterval)) {
      cleanupPollForKey(queryCacheKey)
      return
    }

    const currentPoll = currentPolls.get(queryCacheKey)

    if (!currentPoll) {
      startNextPoll({ queryCacheKey }, api)
      return
    }

    const pollingInterval = Math.min(
      lowestPollingInterval,
      THIRTY_TWO_BIT_MAX_INT,
    )
    if (pollingInterval > currentPoll.pollingInterval) {
      // A slower interval pushes the pending poll back, counting from when
      // the current wait started
      const lastPollStart =
        currentPoll.nextPollTimestamp - currentPoll.pollingInterval
      startNextPoll(
        { queryCacheKey },
        api,
        lastPollStart + pollingInterval - Date.now(),
      )
    } else if (Date.now() + pollingInterval < currentPoll.nextPollTimestamp) {
      startNextPoll({ queryCacheKey }, api)
    }
  }

  function cleanupPollForKey(key: string) {
    const existingPoll = currentPolls.get(key)
    if (existingPoll?.timeout) {
      clearTimeout(existingPoll.timeout)
    }
    currentPolls.delete(key)
  }

  function clearPolls() {
    for (const key of currentPolls.keys()) {
      cleanupPollForKey(key)
    }
  }

  function findLowestPollingInterval(
    subscribers: SubscribersInternal = new Map(),
  ) {
    let skipPollingIfUnfocused: boolean | undefined = false
    let lowestPollingInterval = Number.POSITIVE_INFINITY

    for (const entry of subscribers.values()) {
      if (entry.pollingInterval) {
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
