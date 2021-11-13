import { counterActions, counterSelectors } from './slice'
import { AppListenerApi } from '../../store'

export async function onIncrementByPeriodically(
  {
    payload: { id, delta },
  }: ReturnType<typeof counterActions.incrementByPeriodically>,
  { dispatch, getState, getOriginalState, condition }: AppListenerApi
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

  const intervalMs = setInterval(() => {
    dispatch(counterActions.updateBy({ id, delta }))
  }, counter.intervalMs)

  while (true) {
    if (
      await condition(
        (action) =>
          counterActions.cancelIncrementBy.match(action) &&
          action.payload === id
      )
    ) {
      clearInterval(intervalMs)
      console.log(`period update of ${counter.id} completed`);
      break
    }
  }

}
