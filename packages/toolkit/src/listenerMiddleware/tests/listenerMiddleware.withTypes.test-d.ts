import type {
  Action,
  ThunkAction,
  TypedAddListener,
  TypedRemoveListener,
  TypedStartListening,
  TypedStopListening,
} from '@reduxjs/toolkit'
import {
  addListener,
  configureStore,
  createAsyncThunk,
  createListenerMiddleware,
  createSlice,
  removeListener,
} from '@reduxjs/toolkit'
import { describe, expectTypeOf, test } from 'vitest'

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
    setTimeout(() => resolve({ data: amount }), 500),
  )
}

export const incrementAsync = createAsyncThunk(
  'counter/fetchCount',
  async (amount: number) => {
    const response = await fetchCount(amount)
    // The value we return becomes the `fulfilled` action payload
    return response.data
  },
)

const { increment } = counterSlice.actions

const store = configureStore({
  reducer: counterSlice.reducer,
})

type AppStore = typeof store
type AppDispatch = typeof store.dispatch
type RootState = ReturnType<typeof store.getState>
type AppThunk<ThunkReturnType = void> = ThunkAction<
  AppDispatch,
  RootState,
  unknown,
  ThunkReturnType
>

describe('listenerMiddleware.withTypes<RootState, AppDispatch>()', () => {
  const listenerMiddleware = createListenerMiddleware()
  let timeout: number | undefined = undefined
  let done = false

  type ExpectedTakeResultType =
    | [ReturnType<typeof increment>, RootState, RootState]
    | null

  test('startListening.withTypes', () => {
    const startAppListening = listenerMiddleware.startListening.withTypes<
      RootState,
      AppDispatch
    >()

    expectTypeOf(startAppListening).toEqualTypeOf<
      TypedStartListening<RootState, AppDispatch>
    >()

    startAppListening({
      predicate: increment.match,
      effect: async (action, listenerApi) => {
        const stateBefore = listenerApi.getState()

        expectTypeOf(increment).returns.toEqualTypeOf(action)

        expectTypeOf(listenerApi.dispatch).toEqualTypeOf<AppDispatch>()

        expectTypeOf(stateBefore).toEqualTypeOf<RootState>()

        let takeResult = await listenerApi.take(increment.match, timeout)
        const stateCurrent = listenerApi.getState()

        expectTypeOf(takeResult).toEqualTypeOf<ExpectedTakeResultType>()

        expectTypeOf(stateCurrent).toEqualTypeOf<RootState>()

        timeout = 1
        takeResult = await listenerApi.take(increment.match, timeout)

        done = true
      },
    })
  })

  test('addListener.withTypes', () => {
    const addAppListener = addListener.withTypes<RootState, AppDispatch>()

    expectTypeOf(addAppListener).toEqualTypeOf<
      TypedAddListener<RootState, AppDispatch>
    >()

    store.dispatch(
      addAppListener({
        matcher: increment.match,
        effect: (action, listenerApi) => {
          const state = listenerApi.getState()

          expectTypeOf(state).toEqualTypeOf<RootState>()

          expectTypeOf(listenerApi.dispatch).toEqualTypeOf<AppDispatch>()
        },
      }),
    )
  })

  test('removeListener.withTypes', () => {
    const removeAppListener = removeListener.withTypes<RootState, AppDispatch>()

    expectTypeOf(removeAppListener).toEqualTypeOf<
      TypedRemoveListener<RootState, AppDispatch>
    >()
  })

  test('stopListening.withTypes', () => {
    const stopAppListening = listenerMiddleware.stopListening.withTypes<
      RootState,
      AppDispatch
    >()

    expectTypeOf(stopAppListening).toEqualTypeOf<
      TypedStopListening<RootState, AppDispatch>
    >()
  })
})
