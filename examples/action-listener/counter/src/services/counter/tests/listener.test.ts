import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { setupCounterListeners } from '../listeners'
import { counterSlice, counterActions, counterSelectors } from '../slice'
import type { AppStartListening } from '../../../store'

function delay(timerMs: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(resolve, timerMs, timerMs)
  })
}

jest.useRealTimers()

describe('counter - listeners', () => {
  const onMiddlewareError = jest.fn((): void => {}) // https://jestjs.io/docs/mock-function-api

  /**
   * @see https://redux-toolkit.js.org/api/createListenerMiddleware
   */
  const listenerMiddlewareInstance = createListenerMiddleware({
    onError: onMiddlewareError,
  })

  function setupTestStore() {
    return configureStore({
      reducer: {
        [counterSlice.name]: counterSlice.reducer,
      },
      middleware: (gDM) => gDM().prepend(listenerMiddlewareInstance.middleware),
    })
  }

  let store = setupTestStore()

  beforeEach(() => {
    listenerMiddlewareInstance.clearListeners() // Stops and cancels active listeners https://redux-toolkit.js.org/api/createListenerMiddleware#clearlisteners
    onMiddlewareError.mockClear() // https://jestjs.io/docs/mock-function-api#mockfnmockclear
    store = setupTestStore() // resets store state

    setupCounterListeners(
      listenerMiddlewareInstance.startListening as AppStartListening
    )
  })

  describe('onUpdateAsync', () => {
    const delayMs = 10
    const initialValue = 2
    const delta = 2

    it('asynchronously adds `payload.delta` after `payload.delayMs` to counter', async () => {
      store.dispatch(counterActions.addCounter({ initialValue }))

      const { id } = counterSelectors.selectAll(store.getState())[0]

      store.dispatch(counterActions.updateByAsync({ id, delayMs, delta }))

      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue
      )

      await delay(delayMs)

      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue + delta
      )
    })

    it('stops updates if cancelAsyncUpdates is dispatched', async () => {
      store.dispatch(counterActions.addCounter({ initialValue }))

      const { id } = counterSelectors.selectAll(store.getState())[0]

      store.dispatch(counterActions.updateByAsync({ id, delayMs, delta }))

      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue
      )

      store.dispatch(counterActions.cancelAsyncUpdates(id))

      await delay(delayMs)

      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue
      )
    })
  })

  describe('onUpdateByPeriodically', () => {
    const intervalMs = 10
    const initialValue = 2
    const delta = 2

    it('periodically adds `payload.delta` after `payload.intervalMs` to counter', async () => {
      store.dispatch(counterActions.addCounter({ initialValue }))

      const { id } = counterSelectors.selectAll(store.getState())[0]

      store.dispatch(
        counterActions.updateByPeriodically({ id, intervalMs, delta })
      )

      for (let i = 0; i < 2; i++) {
        expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
          initialValue + i * delta
        )

        await delay(intervalMs)

        expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
          initialValue + (i + 1) * delta
        )
      }
    })

    it('stops updates if cancelAsyncUpdates is dispatched', async () => {
      store.dispatch(counterActions.addCounter({ initialValue }))

      const { id } = counterSelectors.selectAll(store.getState())[0]

      store.dispatch(
        counterActions.updateByPeriodically({ id, intervalMs, delta })
      )

      await delay(intervalMs)
      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue + delta
      )

      store.dispatch(counterActions.cancelAsyncUpdates(id))

      await delay(intervalMs)

      expect(counterSelectors.selectById(store.getState(), id)?.value).toBe(
        initialValue + delta
      )
    })
  })
})
