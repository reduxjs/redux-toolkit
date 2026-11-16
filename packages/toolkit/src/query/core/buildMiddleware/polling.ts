import type {
  QueryCacheEntry,
  QueryCacheKey,
  QueryStatus,
  QuerySubState,
  QuerySubstateIdentifier,
  Subscribers,
  SubscribersInternal,
} from '../apiState'
import type { QueryDefinition } from '../../endpointDefinitions'
import { STATUS_PENDING, STATUS_UNINITIALIZED } from '../apiState'
import { THIRTY_TWO_BIT_MAX_INT } from './cacheCollection'
import type {
  QueryStateMeta,
  SubMiddlewareApi,
  TimeoutId,
  InternalHandlerBuilder,
  ApiMiddlewareInternalHandler,
} from './types'
import { clearPoll, setPoll } from './runtime'

type AnyQueryDefinition = QueryDefinition<any, any, any, any>
type PollingIntervalFn = (
  cacheEntry: QueryCacheEntry<AnyQueryDefinition>,
) => number
type InitializedQuerySubState = Exclude<
  QuerySubState<AnyQueryDefinition>,
  { status: QueryStatus.uninitialized }
>

export const buildPollingHandler: InternalHandlerBuilder = ({
  reducerPath,
  queryThunk,
  api,
  refetchQuery,
  runtime,
}) => {
  const getSubscribers = (queryCacheKey: string) =>
    runtime.queries.get(queryCacheKey)?.subscribers

  const { pendingPollingUpdates } = runtime

  const pollingIntervalResults = new WeakMap<
    PollingIntervalFn,
    { querySubState: InitializedQuerySubState; result: number }
  >()

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
  }

  function schedulePollingUpdate(queryCacheKey: string, api: SubMiddlewareApi) {
    if (
      !runtime.queries.get(queryCacheKey)?.poll &&
      !findPollingSubscribers(getSubscribers(queryCacheKey))
        .hasPollingSubscriber
    ) {
      return
    }
    pendingPollingUpdates.keys.add(queryCacheKey)

    if (!pendingPollingUpdates.timer) {
      pendingPollingUpdates.timer = setTimeout(() => {
        try {
          // Process all pending updates in a single batch
          for (const key of pendingPollingUpdates.keys) {
            updatePollingInterval({ queryCacheKey: key as any }, api)
          }
        } finally {
          pendingPollingUpdates.keys.clear()
          pendingPollingUpdates.timer = undefined
        }
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

    if (!querySubState || querySubState.status === STATUS_UNINITIALIZED) {
      cleanupPollForKey(queryCacheKey)
      return
    }

    const lowestPollingInterval = findLowestPollingInterval(
      getSubscribers(queryCacheKey),
      querySubState,
      queryCacheKey,
    )

    if (!Number.isFinite(lowestPollingInterval)) {
      cleanupPollForKey(queryCacheKey)
      return
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

    setPoll(runtime, queryCacheKey, {
      nextPollTimestamp,
      pollingInterval,
      timeout: setTimeout(() => {
        const currentState = api.getState()[reducerPath]
        const currentQuerySubState = currentState.queries[queryCacheKey]
        // The subscription map and cache entry may have changed since this
        // poll was scheduled, because unsubscribe cleanup is deferred.
        const { hasPollingSubscriber, skipPollingIfUnfocused } =
          findPollingSubscribers(getSubscribers(queryCacheKey))
        if (
          !currentQuerySubState ||
          currentQuerySubState.status === STATUS_UNINITIALIZED ||
          !hasPollingSubscriber
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
          api.dispatch(refetchQuery(currentQuerySubState, 'poll'))
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
    const subscriptions = getSubscribers(queryCacheKey)

    if (!querySubState || querySubState.status === STATUS_UNINITIALIZED) {
      return
    }

    if (process.env.NODE_ENV === 'test') {
      const updateCounters = (runtime.pollUpdateCounters ??= {})
      updateCounters[queryCacheKey] = (updateCounters[queryCacheKey] ?? 0) + 1
    }

    const lowestPollingInterval = findLowestPollingInterval(
      subscriptions,
      querySubState,
      queryCacheKey,
    )

    if (!Number.isFinite(lowestPollingInterval)) {
      cleanupPollForKey(queryCacheKey)
      return
    }

    const currentPoll = runtime.queries.get(queryCacheKey)?.poll

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
    clearPoll(runtime, key)
  }

  // Does not call polling interval functions, so a function counts as polling.
  // Its `skipPollingIfUnfocused` only applies if its last result was a poll.
  function findPollingSubscribers(
    subscribers: SubscribersInternal = new Map(),
  ) {
    let hasPollingSubscriber = false
    let skipPollingIfUnfocused = false

    for (const entry of subscribers.values()) {
      const { pollingInterval } = entry
      let isPolling: boolean
      if (typeof pollingInterval === 'function') {
        hasPollingSubscriber = true
        const previous = pollingIntervalResults.get(pollingInterval)
        isPolling = !previous || isPositiveInterval(previous.result)
      } else {
        isPolling = isPositiveInterval(pollingInterval)
        hasPollingSubscriber ||= isPolling
      }
      if (isPolling) {
        skipPollingIfUnfocused ||= !!entry.skipPollingIfUnfocused
      }
    }

    return { hasPollingSubscriber, skipPollingIfUnfocused }
  }

  function findLowestPollingInterval(
    subscribers: SubscribersInternal = new Map(),
    querySubState: InitializedQuerySubState,
    queryCacheKey: QueryCacheKey,
  ) {
    let lowestPollingInterval = Number.POSITIVE_INFINITY

    for (const { pollingInterval } of subscribers.values()) {
      let interval = pollingInterval
      if (typeof pollingInterval === 'function') {
        // The pending request's `fulfilled` or `rejected` action schedules
        // the next poll with the settled entry
        if (querySubState.status === STATUS_PENDING) continue
        interval = callPollingInterval(
          pollingInterval,
          querySubState,
          queryCacheKey,
        )
      }
      if (isPositiveInterval(interval)) {
        lowestPollingInterval = Math.min(interval, lowestPollingInterval)
      }
    }

    return lowestPollingInterval
  }

  // Each function runs at most once per cache entry state
  function callPollingInterval(
    pollingInterval: PollingIntervalFn,
    querySubState: InitializedQuerySubState,
    queryCacheKey: QueryCacheKey,
  ) {
    const previous = pollingIntervalResults.get(pollingInterval)
    if (previous?.querySubState === querySubState) {
      return previous.result
    }
    let result: number
    try {
      result = pollingInterval({ ...querySubState, queryCacheKey })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          `Error in pollingInterval function for "${queryCacheKey}". Polling is skipped for this subscriber until the cache entry changes.`,
          error,
        )
      }
      result = 0
    }
    pollingIntervalResults.set(pollingInterval, { querySubState, result })
    return result
  }

  return handler
}

function isPositiveInterval(interval: unknown): interval is number {
  return typeof interval === 'number' && interval > 0
}
