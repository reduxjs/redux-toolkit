import type { TypedStartListening } from '@reduxjs/toolkit'
import {
  configureStore,
  createAsyncThunk,
  createListenerMiddleware,
  createSlice,
} from '@reduxjs/toolkit'
import type { Action } from 'redux'
import type { ThunkAction } from 'redux-thunk'
import { expectTypeOf } from 'vitest'

export interface CounterState {
  counter: number
}

const initialState: CounterState = {
  counter: 0,
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment(state) {
      state.counter++
    },
  },
})

export function fetchCount(amount = 1) {
  return new Promise<{ data: number }>((resolve) =>
    setTimeout(() => resolve({ data: amount }), 500)
  )
}

export const incrementAsync = createAsyncThunk(
  'counter/fetchCount',
  async (amount: number) => {
    const response = await fetchCount(amount)
    // The value we return becomes the `fulfilled` action payload
    return response.data
  }
)

const { increment } = counterSlice.actions

const counterStore = configureStore({
  reducer: counterSlice.reducer,
})

type AppStore = typeof counterStore
type AppDispatch = typeof counterStore.dispatch
type RootState = ReturnType<typeof counterStore.getState>
type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

describe('listenerMiddleware.withTypes<RootState, AppDispatch>()', () => {
  const listenerMiddleware = createListenerMiddleware()
  let timeout: number | undefined = undefined
  let done = false

  type ExpectedTakeResultType =
    | readonly [ReturnType<typeof increment>, CounterState, CounterState]
    | null

  test('startListening.withTypes', () => {
    const startAppListening = listenerMiddleware.startListening.withTypes<
      CounterState,
      AppDispatch
    >()

    expectTypeOf(startAppListening).toEqualTypeOf<
      TypedStartListening<CounterState, AppDispatch>
    >()

    startAppListening({
      predicate: increment.match,
      effect: async (_, listenerApi) => {
        const stateBefore = listenerApi.getState()

        expectTypeOf(stateBefore).toEqualTypeOf<CounterState>()

        let takeResult = await listenerApi.take(increment.match, timeout)
        const stateCurrent = listenerApi.getState()

        expectTypeOf(stateCurrent).toEqualTypeOf<CounterState>()

        timeout = 1
        takeResult = await listenerApi.take(increment.match, timeout)

        done = true
      },
    })
  })

  test.todo('addListener.withTypes', () => {})
})
