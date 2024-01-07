import type { Action } from 'redux'
import type { ThunkAction } from 'redux-thunk'
import { describe, expect, test } from 'vitest'
import { configureStore } from '../../configureStore'
import { createAsyncThunk } from '../../createAsyncThunk'
import { createSlice } from '../../createSlice'
import { addListener, createListenerMiddleware, removeListener } from '../index'

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

const store = configureStore({
  reducer: counterSlice.reducer,
})

type AppStore = typeof store
type AppDispatch = typeof store.dispatch
type RootState = ReturnType<typeof store.getState>
type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

const listenerMiddleware = createListenerMiddleware()

const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>()

const stopAppListening = listenerMiddleware.stopListening.withTypes<
  RootState,
  AppDispatch
>()

const addAppListener = addListener.withTypes<RootState, AppDispatch>()

const removeAppListener = removeListener.withTypes<RootState, AppDispatch>()

describe(startAppListening.withTypes, () => {
  test('should return startListening', () => {
    expect(startAppListening.withTypes).to.be.a('function')

    expect(startAppListening.withTypes().withTypes).to.be.a('function')

    expect(startAppListening).toBe(listenerMiddleware.startListening)
  })
})

describe(stopAppListening.withTypes, () => {
  test('should return stopListening', () => {
    expect(stopAppListening.withTypes).to.be.a('function')

    expect(stopAppListening.withTypes().withTypes).to.be.a('function')

    expect(stopAppListening).toBe(listenerMiddleware.stopListening)
  })
})

describe(addAppListener.withTypes, () => {
  test('should return addListener', () => {
    expect(addAppListener.withTypes).to.be.a('function')

    expect(addAppListener.withTypes().withTypes).to.be.a('function')

    expect(addAppListener).toBe(addListener)
  })
})

describe(removeAppListener.withTypes, () => {
  test('should return removeListener', () => {
    expect(removeAppListener.withTypes).to.be.a('function')

    expect(removeAppListener.withTypes().withTypes).to.be.a('function')

    expect(removeAppListener).toBe(removeListener)
  })
})
