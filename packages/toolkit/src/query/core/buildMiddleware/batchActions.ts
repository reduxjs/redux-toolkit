import type { InternalHandlerBuilder, SubscriptionSelectors } from './types'
import type { SubscriptionState } from '../apiState'
import { produceWithPatches } from 'immer'
import type { Action } from '@reduxjs/toolkit'
import { countObjectKeys } from '../../utils/countObjectKeys'

export const buildBatchedActionsHandler: InternalHandlerBuilder<
  [actionShouldContinue: boolean, returnValue: SubscriptionSelectors | boolean]
> = ({ api, queryThunk, internalState }) => {
  const subscriptionsPrefix = `${api.reducerPath}/subscriptions`

  let previousSubscriptions: SubscriptionState =
    null as unknown as SubscriptionState

  let updateSyncTimer: ReturnType<typeof window.setTimeout> | null = null

  const { updateSubscriptionOptions, unsubscribeQueryResult } =
    api.internalActions

  // Actually intentionally mutate the subscriptions state used in the middleware
  // This is done to speed up perf when loading many components
  const actuallyMutateSubscriptions = (
    mutableState: SubscriptionState,
    action: Action,
  ) => {
    if (updateSubscriptionOptions.match(action)) {
      const { queryCacheKey, requestId, options } = action.payload

      if (mutableState?.[queryCacheKey]?.[requestId]) {
        mutableState[queryCacheKey]![requestId] = options
      }
      return true
    }
    if (unsubscribeQueryResult.match(action)) {
      const { queryCacheKey, requestId } = action.payload
      if (mutableState[queryCacheKey]) {
        delete mutableState[queryCacheKey]![requestId]
      }
      return true
    }
    if (api.internalActions.removeQueryResult.match(action)) {
      delete mutableState[action.payload.queryCacheKey]
      return true
    }
    if (queryThunk.pending.match(action)) {
      const {
        meta: { arg, requestId },
      } = action
      const substate = (mutableState[arg.queryCacheKey] ??= {})
      substate[`${requestId}_running`] = {}
      if (arg.subscribe) {
        substate[requestId] =
          arg.subscriptionOptions ?? substate[requestId] ?? {}
      }
      return true
    }
    let mutated = false
    if (
      queryThunk.fulfilled.match(action) ||
      queryThunk.rejected.match(action)
    ) {
      const state = mutableState[action.meta.arg.queryCacheKey] || {}
      const key = `${action.meta.requestId}_running`
      mutated ||= !!state[key]
      delete state[key]
    }
    if (queryThunk.rejected.match(action)) {
      const {
        meta: { condition, arg, requestId },
      } = action
      if (condition && arg.subscribe) {
        const substate = (mutableState[arg.queryCacheKey] ??= {})
        substate[requestId] =
          arg.subscriptionOptions ?? substate[requestId] ?? {}

        mutated = true
      }
    }

    return mutated
  }

  const getSubscriptions = () => internalState.currentSubscriptions
  const getSubscriptionCount = (queryCacheKey: string) => {
    const subscriptions = getSubscriptions()
    const subscriptionsForQueryArg = subscriptions[queryCacheKey] ?? {}
    return countObjectKeys(subscriptionsForQueryArg)
  }
  const isRequestSubscribed = (queryCacheKey: string, requestId: string) => {
    const subscriptions = getSubscriptions()
    return !!subscriptions?.[queryCacheKey]?.[requestId]
  }

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
    if (!previousSubscriptions) {
      // Initialize it the first time this handler runs
      previousSubscriptions = JSON.parse(
        JSON.stringify(internalState.currentSubscriptions),
      )
    }

    if (api.util.resetApiState.match(action)) {
      previousSubscriptions = internalState.currentSubscriptions = {}
      updateSyncTimer = null
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
    const didMutate = actuallyMutateSubscriptions(
      internalState.currentSubscriptions,
      action,
    )

    let actionShouldContinue = true

    if (didMutate) {
      if (!updateSyncTimer) {
        // We only use the subscription state for the Redux DevTools at this point,
        // as the real data is kept here in the middleware.
        // Given that, we can throttle synchronizing this state significantly to
        // save on overall perf.
        // In 1.9, it was updated in a microtask, but now we do it at most every 500ms.
        updateSyncTimer = setTimeout(() => {
          // Deep clone the current subscription data
          const newSubscriptions: SubscriptionState = JSON.parse(
            JSON.stringify(internalState.currentSubscriptions),
          )
          // Figure out a smaller diff between original and current
          const [, patches] = produceWithPatches(
            previousSubscriptions,
            () => newSubscriptions,
          )

          // Sync the store state for visibility
          mwApi.next(api.internalActions.subscriptionsUpdated(patches))
          // Save the cloned state for later reference
          previousSubscriptions = newSubscriptions
          updateSyncTimer = null
        }, 500)
      }

      const isSubscriptionSliceAction =
        typeof action.type == 'string' &&
        !!action.type.startsWith(subscriptionsPrefix)

      const isAdditionalSubscriptionAction =
        queryThunk.rejected.match(action) &&
        action.meta.condition &&
        !!action.meta.arg.subscribe

      actionShouldContinue =
        !isSubscriptionSliceAction && !isAdditionalSubscriptionAction
    }

    return [actionShouldContinue, false]
  }
}
