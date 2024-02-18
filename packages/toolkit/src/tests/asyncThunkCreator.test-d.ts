import type {
  ThunkDispatch,
  SerializedError,
  AsyncThunk,
  CaseReducer,
} from '@reduxjs/toolkit'
import {
  asyncThunkCreator,
  buildCreateSlice,
  isRejected,
  configureStore,
} from '@reduxjs/toolkit'

describe('type tests', () => {
  test('reducer callback', () => {
    interface TestState {
      foo: string
    }

    interface TestArg {
      test: string
    }

    interface TestReturned {
      payload: string
    }

    interface TestReject {
      cause: string
    }

    const createAppSlice = buildCreateSlice({
      creators: { asyncThunk: asyncThunkCreator },
    })

    const slice = createAppSlice({
      name: 'test',
      initialState: {} as TestState,
      reducers: (create) => {
        const preTypedAsyncThunk = create.asyncThunk.withTypes<{
          rejectValue: TestReject
        }>()

        // @ts-expect-error
        create.asyncThunk<any, any, { state: StoreState }>(() => {})

        // @ts-expect-error
        create.asyncThunk.withTypes<{
          rejectValue: string
          dispatch: StoreDispatch
        }>()

        return {
          testInfer: create.asyncThunk(
            function payloadCreator(arg: TestArg, api) {
              return Promise.resolve<TestReturned>({ payload: 'foo' })
            },
            {
              pending(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()
              },
              fulfilled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
              },
              rejected(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.error).toEqualTypeOf<SerializedError>()
              },
              settled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                if (isRejected(action)) {
                  expectTypeOf(action.error).toEqualTypeOf<SerializedError>()
                } else {
                  expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
                }
              },
            },
          ),
          testExplicitType: create.asyncThunk<
            TestReturned,
            TestArg,
            {
              rejectValue: TestReject
            }
          >(
            function payloadCreator(arg, api) {
              // here would be a circular reference
              expectTypeOf(api.getState()).toBeUnknown()
              // here would be a circular reference
              expectTypeOf(api.dispatch).toMatchTypeOf<
                ThunkDispatch<any, any, any>
              >()

              // so you need to cast inside instead
              const getState = api.getState as () => StoreState
              const dispatch = api.dispatch as StoreDispatch

              expectTypeOf(arg).toEqualTypeOf<TestArg>()

              expectTypeOf(api.rejectWithValue).toMatchTypeOf<
                (value: TestReject) => any
              >()

              return Promise.resolve({ payload: 'foo' })
            },
            {
              pending(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()
              },
              fulfilled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
              },
              rejected(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.error).toEqualTypeOf<SerializedError>()

                expectTypeOf(action.payload).toEqualTypeOf<
                  TestReject | undefined
                >()
              },
              settled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                if (isRejected(action)) {
                  expectTypeOf(action.error).toEqualTypeOf<SerializedError>()

                  expectTypeOf(action.payload).toEqualTypeOf<
                    TestReject | undefined
                  >()
                } else {
                  expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
                }
              },
            },
          ),
          testPreTyped: preTypedAsyncThunk(
            function payloadCreator(arg: TestArg, api) {
              expectTypeOf(api.rejectWithValue).toMatchTypeOf<
                (value: TestReject) => any
              >()

              return Promise.resolve<TestReturned>({ payload: 'foo' })
            },
            {
              pending(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()
              },
              fulfilled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
              },
              rejected(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                expectTypeOf(action.error).toEqualTypeOf<SerializedError>()

                expectTypeOf(action.payload).toEqualTypeOf<
                  TestReject | undefined
                >()
              },
              settled(state, action) {
                expectTypeOf(state).toEqualTypeOf<TestState>()

                expectTypeOf(action.meta.arg).toEqualTypeOf<TestArg>()

                if (isRejected(action)) {
                  expectTypeOf(action.error).toEqualTypeOf<SerializedError>()

                  expectTypeOf(action.payload).toEqualTypeOf<
                    TestReject | undefined
                  >()
                } else {
                  expectTypeOf(action.payload).toEqualTypeOf<TestReturned>()
                }
              },
            },
          ),
        }
      },
    })

    const store = configureStore({ reducer: { test: slice.reducer } })

    type StoreState = ReturnType<typeof store.getState>

    type StoreDispatch = typeof store.dispatch

    expectTypeOf(slice.actions.testInfer).toEqualTypeOf<
      AsyncThunk<TestReturned, TestArg, {}>
    >()

    expectTypeOf(slice.actions.testExplicitType).toEqualTypeOf<
      AsyncThunk<TestReturned, TestArg, { rejectValue: TestReject }>
    >()

    type TestInferThunk = AsyncThunk<TestReturned, TestArg, {}>

    expectTypeOf(slice.caseReducers.testInfer.pending).toEqualTypeOf<
      CaseReducer<TestState, ReturnType<TestInferThunk['pending']>>
    >()

    expectTypeOf(slice.caseReducers.testInfer.fulfilled).toEqualTypeOf<
      CaseReducer<TestState, ReturnType<TestInferThunk['fulfilled']>>
    >()

    expectTypeOf(slice.caseReducers.testInfer.rejected).toEqualTypeOf<
      CaseReducer<TestState, ReturnType<TestInferThunk['rejected']>>
    >()
  })
})
