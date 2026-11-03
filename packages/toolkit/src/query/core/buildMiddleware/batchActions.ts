import type { InternalHandlerBuilder, SubscriptionSelectors } from './types'
import type { SubscriptionOptions } from '../apiState'
import type { Action } from '@reduxjs/toolkit'
import type { Patch } from 'immer'
import { ensureRecord, getPollsView, pruneRecord } from './runtime'

export const buildBatchedActionsHandler: InternalHandlerBuilder<
  [actionShouldContinue: boolean, returnValue: SubscriptionSelectors | boolean]
> = ({ api, queryThunk, runtime, mwApi }) => {
  const subscriptionsPrefix = `${api.reducerPath}/subscriptions`

  // Keys whose subscribers changed since the last sync to the store
  const changedKeys = new Set<string>()
  // Keys the sync has written to the store, so removals of keys that were
  // never synced do not cause an extra sync
  const syncedKeys = new Set<string>()

  let updateSyncTimer: ReturnType<typeof window.setTimeout> | null = null

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
          value: Object.fromEntries(subscribers),
        })
      } else {
        syncedKeys.delete(queryCacheKey)
        patches.push({ op: 'remove', path: [queryCacheKey] })
      }
    }
    changedKeys.clear()
    return patches
  }

  const getSubscribers = (queryCacheKey: string) =>
    (ensureRecord(runtime, queryCacheKey).subscribers ??= new Map())

  const addSubscriber = (
    queryCacheKey: string,
    requestId: string,
    subscriptionOptions: SubscriptionOptions | undefined,
  ) => {
    const substate = getSubscribers(queryCacheKey)
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
      const { queryCacheKey } = action.payload
      const record = runtime.queries.get(queryCacheKey)
      if (record) {
        record.subscribers = undefined
        pruneRecord(runtime, queryCacheKey)
      }
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
      getSubscribers(arg.queryCacheKey)
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

  const getSubscriptions = () => runtime.subscriptions
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
    if (api.util.resetApiState.match(action)) {
      changedKeys.clear()
      syncedKeys.clear()
      for (const record of runtime.queries.values()) {
        record.subscribers = undefined
        pruneRecord(runtime, record.key)
      }
      if (updateSyncTimer) {
        clearTimeout(updateSyncTimer)
        updateSyncTimer = null
      }
      return [true, false]
    }

    // Intercept requests by hooks to see if they're subscribed
    // We return the internal state reference so that hooks
    // can do their own checks to see if they're still active.
    // It's stupid and hacky, but it does cut down on some dispatch calls.
    if (api.internalActions.internal_getRTKQSubscriptions.match(action)) {
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
        return [false, runtime.pollUpdateCounters] as any
      }
    }

    if (didMutate && !updateSyncTimer) {
      // We only use the subscription state for the Redux DevTools at this point,
      // as the real data is kept here in the middleware.
      // Given that, we can throttle synchronizing this state significantly to
      // save on overall perf.
      // In 1.9, it was updated in a microtask, but now we do it at most every 500ms.
      updateSyncTimer = setTimeout(() => {
        const patches = buildSubscriptionPatches()
        updateSyncTimer = null
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
