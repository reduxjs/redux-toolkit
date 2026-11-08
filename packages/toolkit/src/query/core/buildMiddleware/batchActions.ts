import type { InternalHandlerBuilder, SubscriptionSelectors } from './types'
import type {
  SubscriptionInternalState,
  SubscriptionOptions,
} from '../apiState'
import type { Action } from '@reduxjs/toolkit'
import type { Patch } from 'immer'
import { ensureRecord, getPollsView } from './runtime'

const warnedProbeApis = new WeakSet<object>()

// The store copy of subscriptions is only for devtools, so function
// polling intervals are left out to keep it serializable
const serializableSubscribers = (
  subscribers: Map<string, SubscriptionOptions>,
) => {
  const result: Record<string, SubscriptionOptions> = {}
  for (const [requestId, options] of subscribers) {
    if (typeof options.pollingInterval === 'function') {
      const { pollingInterval, ...rest } = options
      result[requestId] = rest
    } else {
      result[requestId] = options
    }
  }
  return result
}

export const buildBatchedActionsHandler: InternalHandlerBuilder<
  [actionShouldContinue: boolean, returnValue: SubscriptionSelectors | boolean]
> = ({ api, queryThunk, runtime, mwApi }) => {
  const subscriptionsPrefix = `${api.reducerPath}/subscriptions`

  const { subscriptionSync } = runtime
  const { changedKeys, syncedKeys } = subscriptionSync

  const { updateSubscriptionOptions, unsubscribeQueryResult } =
    api.internalActions

  // Patches only touch top-level keys, so they apply cleanly even if the
  // store slice was replaced without a `resetApiState`
  const buildSubscriptionPatches = (): Patch[] => {
    const patches: Patch[] = []
    for (const queryCacheKey of changedKeys) {
      const subscribers = runtime.queries.get(queryCacheKey)?.subscribers
      if (subscribers) {
        syncedKeys.add(queryCacheKey)
        patches.push({
          op: 'add',
          path: [queryCacheKey],
          value: serializableSubscribers(subscribers),
        })
      } else {
        syncedKeys.delete(queryCacheKey)
        patches.push({ op: 'remove', path: [queryCacheKey] })
      }
    }
    changedKeys.clear()
    return patches
  }

  const getOrCreateSubscribers = (queryCacheKey: string) =>
    (ensureRecord(runtime, queryCacheKey).subscribers ??= new Map())

  const addSubscriber = (
    queryCacheKey: string,
    requestId: string,
    subscriptionOptions: SubscriptionOptions | undefined,
  ) => {
    const substate = getOrCreateSubscribers(queryCacheKey)
    const options = subscriptionOptions ?? substate.get(requestId) ?? {}
    substate.set(requestId, options)
    changedKeys.add(queryCacheKey)
  }

  // Actually intentionally mutate the subscriptions state used in the middleware
  // This is done to speed up perf when loading many components.
  // Returns true if subscribers were added, removed or updated.
  const actuallyMutateSubscriptions = (action: Action) => {
    if (updateSubscriptionOptions.match(action)) {
      const { queryCacheKey, requestId, options } = action.payload

      const sub = runtime.queries.get(queryCacheKey)?.subscribers
      if (sub?.has(requestId)) {
        sub.set(requestId, options)
        changedKeys.add(queryCacheKey)
        return true
      }
      return false
    }
    if (unsubscribeQueryResult.match(action)) {
      const { queryCacheKey, requestId } = action.payload
      if (runtime.queries.get(queryCacheKey)?.subscribers?.delete(requestId)) {
        changedKeys.add(queryCacheKey)
        return true
      }
      return false
    }
    if (api.internalActions.removeQueryResult.match(action)) {
      // The query record handler drops the subscribers after the reducer
      const { queryCacheKey } = action.payload
      if (syncedKeys.has(queryCacheKey) || changedKeys.has(queryCacheKey)) {
        changedKeys.add(queryCacheKey)
        return true
      }
      return false
    }
    if (queryThunk.pending.match(action)) {
      const {
        meta: { arg, requestId },
      } = action
      if (arg.subscribe) {
        addSubscriber(arg.queryCacheKey, requestId, arg.subscriptionOptions)
        return true
      }
      getOrCreateSubscribers(arg.queryCacheKey)
      return false
    }
    if (queryThunk.rejected.match(action)) {
      const {
        meta: { condition, arg, requestId },
      } = action
      if (condition && arg.subscribe) {
        addSubscriber(arg.queryCacheKey, requestId, arg.subscriptionOptions)
        return true
      }
    }

    return false
  }

  const getSubscriptions = () => {
    const subscriptions: SubscriptionInternalState = new Map()
    for (const [key, record] of runtime.queries) {
      if (record.subscribers) subscriptions.set(key, record.subscribers)
    }
    return subscriptions
  }
  const getSubscriptionCount = (queryCacheKey: string) =>
    runtime.queries.get(queryCacheKey)?.subscribers?.size ?? 0
  const isRequestSubscribed = (queryCacheKey: string, requestId: string) =>
    !!runtime.queries.get(queryCacheKey)?.subscribers?.get(requestId)

  const subscriptionSelectors: SubscriptionSelectors = {
    getSubscriptions,
    getSubscriptionCount,
    isRequestSubscribed,
  }

  return (
    action,
    mwApi,
  ): [
    actionShouldContinue: boolean,
    result: SubscriptionSelectors | boolean,
  ] => {
    // Kept for hooks adapters copied from older RTK versions; removed in 3.0
    if (api.internalActions.internal_getRTKQSubscriptions.match(action)) {
      if (process.env.NODE_ENV !== 'production' && !warnedProbeApis.has(api)) {
        warnedProbeApis.add(api)
        console.warn(
          `RTK Query: dispatching \`internalActions.internal_getRTKQSubscriptions()\` is deprecated and will be removed in RTK 3.0. Use \`isSubscribed()\` on the result of \`initiate()\` or \`api.util.getMiddlewareState()\` instead.`,
        )
      }
      return [false, subscriptionSelectors]
    }

    // Update subscription data based on this action
    const didMutate = actuallyMutateSubscriptions(action)

    // HACK Sneak the test-only polling state back out
    if (process.env.NODE_ENV === 'test' && typeof action.type === 'string') {
      if (action.type === `${api.reducerPath}/getPolling`) {
        return [false, getPollsView(runtime)] as any
      }
      if (action.type === `${api.reducerPath}/getPollUpdateCounters`) {
        return [false, (runtime.pollUpdateCounters ??= {})] as any
      }
      if (action.type === `${api.reducerPath}/getRuntime`) {
        return [false, runtime] as any
      }
    }

    if (didMutate && !subscriptionSync.timer) {
      // We only use the subscription state for the Redux DevTools at this point,
      // as the real data is kept here in the middleware.
      // Given that, we can throttle synchronizing this state significantly to
      // save on overall perf.
      // In 1.9, it was updated in a microtask, but now we do it at most every 500ms.
      subscriptionSync.timer = setTimeout(() => {
        const patches = buildSubscriptionPatches()
        subscriptionSync.timer = undefined
        if (patches.length) {
          mwApi.next(api.internalActions.subscriptionsUpdated(patches))
        }
      }, 500)
    }

    const isSubscriptionSliceAction =
      typeof action.type == 'string' &&
      action.type.startsWith(subscriptionsPrefix)

    const isAdditionalSubscriptionAction =
      queryThunk.rejected.match(action) &&
      action.meta.condition &&
      !!action.meta.arg.subscribe

    return [
      !isSubscriptionSliceAction && !isAdditionalSubscriptionAction,
      false,
    ]
  }
}
