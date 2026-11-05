import type {
  Action,
  Dispatch,
  ForkedTaskAPI,
  ForkedTaskExecutor,
  TaskResult,
  ThunkAction,
  UnknownAction,
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
  ThunkReturnType,
  RootState,
  unknown,
  Action
>
type ExtraArgument = { foo: string }

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
      AppDispatch,
      ExtraArgument
    >()

    expectTypeOf(startAppListening).toEqualTypeOf<
      TypedStartListening<RootState, AppDispatch, ExtraArgument>
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

        expectTypeOf(listenerApi.extra).toEqualTypeOf<ExtraArgument>()

        listenerApi.fork((forkApi) => {
          expectTypeOf(forkApi).toEqualTypeOf<
            ForkedTaskAPI<RootState, AppDispatch>
          >()
          expectTypeOf(forkApi.getState()).toEqualTypeOf<RootState>()
          expectTypeOf(forkApi.dispatch).toEqualTypeOf<AppDispatch>()

          forkApi.fork((nestedApi) => {
            expectTypeOf(nestedApi.getState()).toEqualTypeOf<RootState>()
            expectTypeOf(nestedApi.dispatch).toEqualTypeOf<AppDispatch>()
            nestedApi.dispatch(incrementAsync(1))
          })
        })

        timeout = 1
        takeResult = await listenerApi.take(increment.match, timeout)

        done = true
      },
    })
  })

  test('addListener.withTypes', () => {
    const addAppListener = addListener.withTypes<
      RootState,
      AppDispatch,
      ExtraArgument
    >()

    expectTypeOf(addAppListener).toEqualTypeOf<
      TypedAddListener<RootState, AppDispatch, ExtraArgument>
    >()

    store.dispatch(
      addAppListener({
        matcher: increment.match,
        effect: (action, listenerApi) => {
          const state = listenerApi.getState()

          expectTypeOf(state).toEqualTypeOf<RootState>()

          expectTypeOf(listenerApi.dispatch).toEqualTypeOf<AppDispatch>()

          expectTypeOf(listenerApi.extra).toEqualTypeOf<ExtraArgument>()

          listenerApi.fork((forkApi) => {
            expectTypeOf(forkApi.getState()).toEqualTypeOf<RootState>()
            expectTypeOf(forkApi.dispatch).toEqualTypeOf<AppDispatch>()
          })
        },
      }),
    )
  })

  test('fork executors declared outside the listener', () => {
    const startAppListening = listenerMiddleware.startListening.withTypes<
      RootState,
      AppDispatch
    >()

    const typedExecutor: ForkedTaskExecutor<number, RootState, AppDispatch> = (
      forkApi,
    ) => forkApi.getState().counter

    const untypedExecutor = async (forkApi: ForkedTaskAPI) => {
      expectTypeOf(forkApi.getState()).toBeUnknown()
      expectTypeOf(forkApi.dispatch).toEqualTypeOf<Dispatch<UnknownAction>>()
      return 'done'
    }

    const otherStateExecutor = (
      forkApi: ForkedTaskAPI<{ somethingElse: string }>,
    ) => forkApi.getState().somethingElse

    startAppListening({
      actionCreator: increment,
      effect: async (_, listenerApi) => {
        expectTypeOf(
          listenerApi.fork(typedExecutor).result,
        ).resolves.toEqualTypeOf<TaskResult<number>>()

        expectTypeOf(
          listenerApi.fork(untypedExecutor).result,
        ).resolves.toEqualTypeOf<TaskResult<string>>()

        listenerApi.fork((forkApi) => {
          expectTypeOf(
            forkApi.fork(typedExecutor).result,
          ).resolves.toEqualTypeOf<TaskResult<number>>()
        })

        // @ts-expect-error
        listenerApi.fork(otherStateExecutor)
      },
    })
  })

  test('removeListener.withTypes', () => {
    const removeAppListener = removeListener.withTypes<
      RootState,
      AppDispatch,
      ExtraArgument
    >()

    expectTypeOf(removeAppListener).toEqualTypeOf<
      TypedRemoveListener<RootState, AppDispatch, ExtraArgument>
    >()
  })

  test('stopListening.withTypes', () => {
    const stopAppListening = listenerMiddleware.stopListening.withTypes<
      RootState,
      AppDispatch,
      ExtraArgument
    >()

    expectTypeOf(stopAppListening).toEqualTypeOf<
      TypedStopListening<RootState, AppDispatch, ExtraArgument>
    >()
  })
})
