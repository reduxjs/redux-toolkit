import { counterActions, counterSelectors } from './slice'
import {
  AnyAction,
  isAllOf,
  isAnyOf,
  PayloadAction,
  Unsubscribe,
} from '@reduxjs/toolkit'
import type { AppListenerEffectAPI, AppStartListening } from '../../store'

function shouldStopAsyncTasksOf(id: string) {
  return isAllOf(
    isAnyOf(counterActions.cancelAsyncUpdates, counterActions.removeCounter),
    (action: AnyAction): action is PayloadAction<string> =>
      action?.payload === id
  )
}

async function onUpdateByPeriodically(
  {
    payload: { id, delta },
  }: ReturnType<typeof counterActions.updateByPeriodically>,
  { dispatch, getState, getOriginalState, condition }: AppListenerEffectAPI
) {
  const counter = counterSelectors.selectById(getState(), id)

  if (!counter || !counter.intervalMs) {
    console.error(`invalid counter update request`)
    return
  }

  const counterBefore = counterSelectors.selectById(getOriginalState(), id)

  if (counterBefore?.intervalMs) {
    console.error(`counter with id "${id}" is already updating periodically`)
    return
  }

  const intervalRef = setInterval(() => {
    dispatch(counterActions.updateBy({ id, delta }))
  }, counter.intervalMs)

  await condition(shouldStopAsyncTasksOf(id))

  clearInterval(intervalRef)
  console.log(`stopped periodic update of ${counter.id}`)
}

async function onUpdateAsync(
  {
    payload: { id, delta, delayMs },
  }: ReturnType<typeof counterActions.updateByAsync>,
  { condition, dispatch, getState }: AppListenerEffectAPI
) {
  const counter = counterSelectors.selectById(getState(), id)

  if (!counter) {
    console.error(`could not find counter with id ${id}`)
    return
  }

  if (!(await condition(shouldStopAsyncTasksOf(id), delayMs))) {
    dispatch(counterActions.updateBy({ id, delta }))
  } else {
    console.log(`blocked async update of ${counter.id}`)
  }
}

/**
 * Subscribes counter listeners and returns a `teardown` function.
 * @example
 * ```ts
 * useEffect(() => {
 *   const unsubscribe = setupCounterListeners();
 *   return unsubscribe;
 * }, []);
 * ```
 */
export function setupCounterListeners(
  startListening: AppStartListening
): Unsubscribe {
  const subscriptions = [
    startListening({
      actionCreator: counterActions.updateByPeriodically,
      effect: onUpdateByPeriodically,
    }),
    startListening({
      actionCreator: counterActions.updateByAsync,
      effect: onUpdateAsync,
    }),
  ]

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe())
  }
}
