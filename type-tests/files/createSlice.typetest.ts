/* eslint-disable no-lone-blocks */
import { Action, AnyAction, Reducer } from 'redux'
import { ValidateSliceCaseReducers } from 'src/createSlice'
import {
  ActionCreatorWithNonInferrablePayload,
  ActionCreatorWithOptionalPayload,
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
  ActionCreatorWithPreparedPayload,
  ActionReducerMapBuilder,
  createAction,
  createSlice,
  PayloadAction,
  SliceCaseReducers,
  SerializedError,
  PayloadActionCreator,
  AsyncThunk,
  CaseReducer
} from '../../src'

function expectType<T>(t: T) {
  return t
}

/*
 * Test: Slice name is strongly typed.
 */

const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: (state: number, action) => state + action.payload,
    decrement: (state: number, action) => state - action.payload
  }
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: 0,
  reducers: {
    goToNext: (state: number, action) => state + action.payload,
    goToPrevious: (state: number, action) => state - action.payload
  }
})

const actionCreators = {
  [counterSlice.name]: { ...counterSlice.actions },
  [uiSlice.name]: { ...uiSlice.actions }
}

expectType<typeof counterSlice.actions>(actionCreators.counter)
expectType<typeof uiSlice.actions>(actionCreators.ui)

// typings:expect-error
const value = actionCreators.anyKey

/*
 * Test: createSlice() infers the returned slice's type.
 */
{
  const firstAction = createAction<{ count: number }>('FIRST_ACTION')

  const slice = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: (state: number, action) => state + action.payload,
      decrement: (state: number, action) => state - action.payload
    },
    extraReducers: {
      [firstAction.type]: (state: number, action) =>
        state + action.payload.count
    }
  })

  /* Reducer */

  const reducer: Reducer<number, PayloadAction> = slice.reducer

  // typings:expect-error
  const stringReducer: Reducer<string, PayloadAction> = slice.reducer
  // typings:expect-error
  const anyActionReducer: Reducer<string, AnyAction> = slice.reducer

  /* Actions */

  slice.actions.increment(1)
  slice.actions.decrement(1)

  // typings:expect-error
  slice.actions.other(1)
}

/*
 * Test: Slice action creator types are inferred.
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: (state, { payload = 1 }: PayloadAction<number | undefined>) =>
        state - payload,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload,
      addTwo: {
        reducer: (s, { payload }: PayloadAction<number>) => s + payload,
        prepare: (a: number, b: number) => ({
          payload: a + b
        })
      }
    }
  })

  expectType<ActionCreatorWithoutPayload>(counter.actions.increment)
  counter.actions.increment()

  expectType<ActionCreatorWithOptionalPayload<number | undefined>>(
    counter.actions.decrement
  )
  counter.actions.decrement()
  counter.actions.decrement(2)

  expectType<ActionCreatorWithPayload<number | number[]>>(
    counter.actions.multiply
  )
  counter.actions.multiply(2)
  counter.actions.multiply([2, 3, 4])

  expectType<ActionCreatorWithPreparedPayload<[number, number], number>>(
    counter.actions.addTwo
  )
  counter.actions.addTwo(1, 2)

  // typings:expect-error
  counter.actions.multiply()

  // typings:expect-error
  counter.actions.multiply('2')

  // typings:expect-error
  counter.actions.addTwo(1)
}

/*
 * Test: Slice action creator types properties are "string"
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload
    }
  })

  const s: string = counter.actions.increment.type
  const t: string = counter.actions.decrement.type
  const u: string = counter.actions.multiply.type

  // typings:expect-error
  const x: 'counter/increment' = counter.actions.increment.type
  // typings:expect-error
  const y: 'increment' = counter.actions.increment.type
}

/*
 * Test: Slice action creator types are inferred for enhanced reducers.
 */
{
  const counter = createSlice({
    name: 'test',
    initialState: { counter: 0, concat: '' },
    reducers: {
      incrementByStrLen: {
        reducer: (state, action: PayloadAction<number>) => {
          state.counter += action.payload
        },
        prepare: (payload: string) => ({
          payload: payload.length
        })
      },
      concatMetaStrLen: {
        reducer: (state, action: PayloadAction<string>) => {
          state.concat += action.payload
        },
        prepare: (payload: string) => ({
          payload,
          meta: payload.length
        })
      }
    }
  })

  expectType<string>(counter.actions.incrementByStrLen('test').type)
  expectType<number>(counter.actions.incrementByStrLen('test').payload)
  expectType<string>(counter.actions.concatMetaStrLen('test').payload)
  expectType<number>(counter.actions.concatMetaStrLen('test').meta)

  // typings:expect-error
  expectType<string>(counter.actions.incrementByStrLen('test').payload)

  // typings:expect-error
  expectType<string>(counter.actions.concatMetaStrLen('test').meta)
}

/**
 * Test: access meta and error from reducer
 */
{
  const counter = createSlice({
    name: 'test',
    initialState: { counter: 0, concat: '' },
    // typings:expect-error
    reducers: {
      // case: meta and error not used in reducer
      testDefaultMetaAndError: {
        reducer(_, action: PayloadAction<number, string>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error'
        })
      },
      // case: meta and error marked as "unknown" in reducer
      testUnknownMetaAndError: {
        reducer(_, action: PayloadAction<number, string, unknown, unknown>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error'
        })
      },
      // case: meta and error are typed in the reducer as returned by prepare
      testMetaAndError: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error'
        })
      },
      // case: meta is typed differently in the reducer than returned from prepare
      testErroneousMeta: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 1,
          error: 'error' as 'error'
        })
      },
      // case: error is typed differently in the reducer than returned from prepare
      testErroneousError: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 1
        })
      }
    }
  })
}

/*
 * Test: returned case reducer has the correct type
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment(state, action: PayloadAction<number>) {
        return state + action.payload
      },
      decrement: {
        reducer(state, action: PayloadAction<number>) {
          return state - action.payload
        },
        prepare(amount: number) {
          return { payload: amount }
        }
      }
    }
  })

  // Should match positively
  expectType<(state: number, action: PayloadAction<number>) => number | void>(
    counter.caseReducers.increment
  )

  // Should match positively for reducers with prepare callback
  expectType<(state: number, action: PayloadAction<number>) => number | void>(
    counter.caseReducers.decrement
  )

  // Should not mismatch the payload if it's a simple reducer
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.increment
  )

  // Should not mismatch the payload if it's a reducer with a prepare callback
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.decrement
  )

  // Should not include entries that don't exist
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.someThingNonExistant
  )
}

/*
 * Test: prepared payload does not match action payload - should cause an error.
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: { counter: 0 },
    // typings:expect-error
    reducers: {
      increment: {
        reducer(state, action: PayloadAction<string>) {
          state.counter += action.payload.length
        },
        prepare(x: string) {
          return {
            payload: 6
          }
        }
      }
    }
  })
}

/*
 * Test: if no Payload Type is specified, accept any payload
 * see https://github.com/reduxjs/redux-toolkit/issues/165
 */
{
  const initialState = {
    name: null
  }

  const mySlice = createSlice({
    name: 'name',
    initialState,
    reducers: {
      setName: (state, action) => {
        state.name = action.payload
      }
    }
  })

  expectType<ActionCreatorWithNonInferrablePayload>(mySlice.actions.setName)

  const x = mySlice.actions.setName

  mySlice.actions.setName(null)
  mySlice.actions.setName('asd')
  mySlice.actions.setName(5)
}

/**
 * Test: actions.x.match()
 */
{
  const mySlice = createSlice({
    name: 'name',
    initialState: { name: 'test' },
    reducers: {
      setName: (state, action: PayloadAction<string>) => {
        state.name = action.payload
      }
    }
  })

  const x: Action<unknown> = {} as any
  if (mySlice.actions.setName.match(x)) {
    expectType<string>(x.type)
    expectType<string>(x.payload)
  } else {
    // typings:expect-error
    expectType<string>(x.type)
    // typings:expect-error
    expectType<string>(x.payload)
  }
}

/** Test:  alternative builder callback for extraReducers */
{
  createSlice({
    name: 'test',
    initialState: 0,
    reducers: {},
    extraReducers: builder => {
      expectType<ActionReducerMapBuilder<number>>(builder)
    }
  })
}

/** Test: wrapping createSlice should be possible */
{
  interface GenericState<T> {
    data?: T
    status: 'loading' | 'finished' | 'error'
  }

  const createGenericSlice = <
    T,
    Reducers extends SliceCaseReducers<GenericState<T>>
  >({
    name = '',
    initialState,
    reducers
  }: {
    name: string
    initialState: GenericState<T>
    reducers: ValidateSliceCaseReducers<GenericState<T>, Reducers>
  }) => {
    return createSlice({
      name,
      initialState,
      reducers: {
        start(state) {
          state.status = 'loading'
        },
        success(state: GenericState<T>, action: PayloadAction<T>) {
          state.data = action.payload
          state.status = 'finished'
        },
        ...reducers
      }
    })
  }

  const wrappedSlice = createGenericSlice({
    name: 'test',
    initialState: { status: 'loading' } as GenericState<string>,
    reducers: {
      magic(state) {
        expectType<GenericState<string>>(state)
        // typings:expect-error
        expectType<GenericState<number>>(state)

        state.status = 'finished'
        state.data = 'hocus pocus'
      }
    }
  })

  expectType<ActionCreatorWithPayload<string>>(wrappedSlice.actions.success)
  expectType<ActionCreatorWithoutPayload<string>>(wrappedSlice.actions.magic)
}

{
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

  const slice = createSlice({
    name: 'test',
    initialState: {} as TestState,
    reducers: create => ({
      normalReducer: create.reducer<string>((state, action) => {
        expectType<TestState>(state)
        expectType<string>(action.payload)
      }),
      testInfer: create.asyncThunk(
        function payloadCreator(arg: TestArg, api) {
          return Promise.resolve<TestReturned>({ payload: 'foo' })
        },
        {
          pending(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
          },
          fulfilled(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
            expectType<TestReturned>(action.payload)
          },
          rejected(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
            expectType<SerializedError>(action.error)
          }
        }
      ),
      testExplictType: create.asyncThunk<
        TestArg,
        TestReturned,
        {
          rejectValue: TestReject
        }
      >(
        function payloadCreator(arg, api) {
          expectType<TestArg>(arg)
          expectType<(value: TestReject) => any>(api.rejectWithValue)
          return Promise.resolve({ payload: 'foo' })
        },
        {
          pending(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
          },
          fulfilled(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
            expectType<TestReturned>(action.payload)
          },
          rejected(state, action) {
            expectType<TestState>(state)
            expectType<TestArg>(action.meta.arg)
            expectType<SerializedError>(action.error)
            expectType<TestReject | undefined>(action.payload)
          }
        }
      )
    })
  })

  expectType<PayloadActionCreator<string>>(slice.actions.normalReducer)
  expectType<AsyncThunk<TestReturned, TestArg, {}>>(slice.actions.testInfer)
  expectType<AsyncThunk<TestReturned, TestArg, { rejectValue: TestReject }>>(
    slice.actions.testExplictType
  )
  {
    type TestInferThunk = AsyncThunk<TestReturned, TestArg, {}>
    expectType<CaseReducer<TestState, ReturnType<TestInferThunk['pending']>>>(
      slice.caseReducers.testInfer.pending
    )
    expectType<CaseReducer<TestState, ReturnType<TestInferThunk['fulfilled']>>>(
      slice.caseReducers.testInfer.fulfilled
    )
    expectType<CaseReducer<TestState, ReturnType<TestInferThunk['rejected']>>>(
      slice.caseReducers.testInfer.rejected
    )
  }
}
