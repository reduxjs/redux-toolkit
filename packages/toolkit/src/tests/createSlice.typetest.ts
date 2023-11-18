import type { Action, UnknownAction, Reducer } from 'redux'
import type {
  ActionCreatorWithNonInferrablePayload,
  ActionCreatorWithOptionalPayload,
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
  ActionCreatorWithPreparedPayload,
  ActionReducerMapBuilder,
  AsyncThunk,
  CaseReducer,
  PayloadAction,
  PayloadActionCreator,
  ReducerCreators,
  SerializedError,
  SliceCaseReducers,
  ThunkDispatch,
  ValidateSliceCaseReducers,
} from '@reduxjs/toolkit'
import {
  configureStore,
  isRejected,
  createAction,
  createSlice,
  buildCreateSlice,
  asyncThunkCreator,
  createAsyncThunk,
} from '@reduxjs/toolkit'
import { expectExactType, expectType, expectUnknown } from './helpers'
import { castDraft } from 'immer'

/*
 * Test: Slice name is strongly typed.
 */

const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: (state: number, action) => state + action.payload,
    decrement: (state: number, action) => state - action.payload,
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: 0,
  reducers: {
    goToNext: (state: number, action) => state + action.payload,
    goToPrevious: (state: number, action) => state - action.payload,
  },
})

const actionCreators = {
  [counterSlice.name]: { ...counterSlice.actions },
  [uiSlice.name]: { ...uiSlice.actions },
}

expectType<typeof counterSlice.actions>(actionCreators.counter)
expectType<typeof uiSlice.actions>(actionCreators.ui)

// @ts-expect-error
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
      decrement: (state: number, action) => state - action.payload,
    },
    extraReducers: (builder) => {
      builder.addCase(
        firstAction,
        (state, action) => state + action.payload.count
      )
    },
  })

  /* Reducer */

  expectType<Reducer<number, PayloadAction>>(slice.reducer)

  // @ts-expect-error
  expectType<Reducer<string, PayloadAction>>(slice.reducer)
  // @ts-expect-error
  expectType<Reducer<string, UnknownAction>>(slice.reducer)
  /* Actions */

  slice.actions.increment(1)
  slice.actions.decrement(1)

  // @ts-expect-error
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
      increment: (state) => state + 1,
      decrement: (state, { payload = 1 }: PayloadAction<number | undefined>) =>
        state - payload,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload,
      addTwo: {
        reducer: (s, { payload }: PayloadAction<number>) => s + payload,
        prepare: (a: number, b: number) => ({
          payload: a + b,
        }),
      },
    },
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

  // @ts-expect-error
  counter.actions.multiply()

  // @ts-expect-error
  counter.actions.multiply('2')

  // @ts-expect-error
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
      increment: (state) => state + 1,
      decrement: (state) => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload,
    },
  })

  const s: 'counter/increment' = counter.actions.increment.type
  const sa: 'counter/increment' = counter.actions.increment().type
  const t: 'counter/decrement' = counter.actions.decrement.type
  const ta: 'counter/decrement' = counter.actions.decrement().type
  const u: 'counter/multiply' = counter.actions.multiply.type
  const ua: 'counter/multiply' = counter.actions.multiply(1).type

  // @ts-expect-error
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
          payload: payload.length,
        }),
      },
      concatMetaStrLen: {
        reducer: (state, action: PayloadAction<string>) => {
          state.concat += action.payload
        },
        prepare: (payload: string) => ({
          payload,
          meta: payload.length,
        }),
      },
    },
  })

  expectType<'test/incrementByStrLen'>(
    counter.actions.incrementByStrLen('test').type
  )
  expectType<number>(counter.actions.incrementByStrLen('test').payload)
  expectType<string>(counter.actions.concatMetaStrLen('test').payload)
  expectType<number>(counter.actions.concatMetaStrLen('test').meta)

  // @ts-expect-error
  expectType<string>(counter.actions.incrementByStrLen('test').payload)

  // @ts-expect-error
  expectType<string>(counter.actions.concatMetaStrLen('test').meta)
}

/**
 * Test: access meta and error from reducer
 */
{
  const counter = createSlice({
    name: 'test',
    initialState: { counter: 0, concat: '' },
    reducers: {
      // case: meta and error not used in reducer
      testDefaultMetaAndError: {
        reducer(_, action: PayloadAction<number, string>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error',
        }),
      },
      // case: meta and error marked as "unknown" in reducer
      testUnknownMetaAndError: {
        reducer(_, action: PayloadAction<number, string, unknown, unknown>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error',
        }),
      },
      // case: meta and error are typed in the reducer as returned by prepare
      testMetaAndError: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 'error' as 'error',
        }),
      },
      // case: meta is typed differently in the reducer than returned from prepare
      testErroneousMeta: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        // @ts-expect-error
        prepare: (payload: number) => ({
          payload,
          meta: 1,
          error: 'error' as 'error',
        }),
      },
      // case: error is typed differently in the reducer than returned from prepare
      testErroneousError: {
        reducer(_, action: PayloadAction<number, string, 'meta', 'error'>) {},
        // @ts-expect-error
        prepare: (payload: number) => ({
          payload,
          meta: 'meta' as 'meta',
          error: 1,
        }),
      },
    },
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
        },
      },
    },
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

  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    // @ts-expect-error
    counter.caseReducers.increment
  )

  // Should not mismatch the payload if it's a reducer with a prepare callback

  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    // @ts-expect-error
    counter.caseReducers.decrement
  )

  // Should not include entries that don't exist

  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    // @ts-expect-error
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
    reducers: {
      increment: {
        reducer(state, action: PayloadAction<string>) {
          state.counter += action.payload.length
        },
        // @ts-expect-error
        prepare(x: string) {
          return {
            payload: 6,
          }
        },
      },
    },
  })
}

/*
 * Test: if no Payload Type is specified, accept any payload
 * see https://github.com/reduxjs/redux-toolkit/issues/165
 */
{
  const initialState = {
    name: null,
  }

  const mySlice = createSlice({
    name: 'name',
    initialState,
    reducers: {
      setName: (state, action) => {
        state.name = action.payload
      },
    },
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
      },
    },
  })

  const x: Action<string> = {} as any
  if (mySlice.actions.setName.match(x)) {
    expectType<'name/setName'>(x.type)
    expectType<string>(x.payload)
  } else {
    // @ts-expect-error
    expectType<'name/setName'>(x.type)
    // @ts-expect-error
    expectType<string>(x.payload)
  }
}

/** Test:  builder callback for extraReducers */
{
  createSlice({
    name: 'test',
    initialState: 0,
    reducers: {},
    extraReducers: (builder) => {
      expectType<ActionReducerMapBuilder<number>>(builder)
    },
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
    reducers,
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
        ...reducers,
      },
    })
  }

  const wrappedSlice = createGenericSlice({
    name: 'test',
    initialState: { status: 'loading' } as GenericState<string>,
    reducers: {
      magic(state) {
        expectType<GenericState<string>>(state)
        // @ts-expect-error
        expectType<GenericState<number>>(state)

        state.status = 'finished'
        state.data = 'hocus pocus'
      },
    },
  })

  expectType<ActionCreatorWithPayload<string>>(wrappedSlice.actions.success)
  expectType<ActionCreatorWithoutPayload<string>>(wrappedSlice.actions.magic)
}

{
  interface GenericState<T> {
    data: T | null
  }

  function createDataSlice<
    T,
    Reducers extends SliceCaseReducers<GenericState<T>>
  >(
    name: string,
    reducers: ValidateSliceCaseReducers<GenericState<T>, Reducers>,
    initialState: GenericState<T>
  ) {
    const doNothing = createAction<undefined>('doNothing')
    const setData = createAction<T>('setData')

    const slice = createSlice({
      name,
      initialState,
      reducers,
      extraReducers: (builder) => {
        builder.addCase(doNothing, (state) => {
          return { ...state }
        })
        builder.addCase(setData, (state, { payload }) => {
          return {
            ...state,
            data: payload,
          }
        })
      },
    })
    return { doNothing, setData, slice }
  }
}

/**
 * Test: slice selectors
 */

{
  const sliceWithoutSelectors = createSlice({
    name: '',
    initialState: '',
    reducers: {},
  })

  // @ts-expect-error
  sliceWithoutSelectors.selectors.foo

  const sliceWithSelectors = createSlice({
    name: 'counter',
    initialState: { value: 0 },
    reducers: {
      increment: (state) => {
        state.value += 1
      },
    },
    selectors: {
      selectValue: (state) => state.value,
      selectMultiply: (state, multiplier: number) => state.value * multiplier,
      selectToFixed: Object.assign(
        (state: { value: number }) => state.value.toFixed(2),
        { static: true }
      ),
    },
  })

  const rootState = {
    [sliceWithSelectors.reducerPath]: sliceWithSelectors.getInitialState(),
  }

  const { selectValue, selectMultiply, selectToFixed } =
    sliceWithSelectors.selectors

  expectType<number>(selectValue(rootState))
  expectType<number>(selectMultiply(rootState, 2))
  expectType<string>(selectToFixed(rootState))

  expectType<boolean>(selectToFixed.unwrapped.static)

  const nestedState = {
    nested: rootState,
  }

  const nestedSelectors = sliceWithSelectors.getSelectors(
    (rootState: typeof nestedState) => rootState.nested.counter
  )

  expectType<number>(nestedSelectors.selectValue(nestedState))
  expectType<number>(nestedSelectors.selectMultiply(nestedState, 2))
  expectType<string>(nestedSelectors.selectToFixed(nestedState))
}

/**
 * Test: reducer callback
 */

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
    reducers: (create) => {
      const pretypedAsyncThunk =
        create.asyncThunk.withTypes<{ rejectValue: TestReject }>()

      // @ts-expect-error
      create.asyncThunk<any, any, { state: StoreState }>(() => {})

      // @ts-expect-error
      create.asyncThunk.withTypes<{
        rejectValue: string
        dispatch: StoreDispatch
      }>()

      return {
        normalReducer: create.reducer<string>((state, action) => {
          expectType<TestState>(state)
          expectType<string>(action.payload)
        }),
        optionalReducer: create.reducer<string | undefined>((state, action) => {
          expectType<TestState>(state)
          expectType<string | undefined>(action.payload)
        }),
        noActionReducer: create.reducer((state) => {
          expectType<TestState>(state)
        }),
        preparedReducer: create.preparedReducer(
          (payload: string) => ({
            payload,
            meta: 'meta' as const,
            error: 'error' as const,
          }),
          (state, action) => {
            expectType<TestState>(state)
            expectType<string>(action.payload)
            expectExactType('meta' as const)(action.meta)
            expectExactType('error' as const)(action.error)
          }
        ),
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
            },
            settled(state, action) {
              expectType<TestState>(state)
              expectType<TestArg>(action.meta.arg)
              if (isRejected(action)) {
                expectType<SerializedError>(action.error)
              } else {
                expectType<TestReturned>(action.payload)
              }
            },
          }
        ),
        testExplicitType: create.asyncThunk<
          TestArg,
          TestReturned,
          {
            rejectValue: TestReject
          }
        >(
          function payloadCreator(arg, api) {
            // here would be a circular reference
            expectUnknown(api.getState())
            // here would be a circular reference
            expectType<ThunkDispatch<any, any, any>>(api.dispatch)
            // so you need to cast inside instead
            const getState = api.getState as () => StoreState
            const dispatch = api.dispatch as StoreDispatch
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
            },
            settled(state, action) {
              expectType<TestState>(state)
              expectType<TestArg>(action.meta.arg)
              if (isRejected(action)) {
                expectType<SerializedError>(action.error)
                expectType<TestReject | undefined>(action.payload)
              } else {
                expectType<TestReturned>(action.payload)
              }
            },
          }
        ),
        testPretyped: pretypedAsyncThunk(
          function payloadCreator(arg: TestArg, api) {
            expectType<(value: TestReject) => any>(api.rejectWithValue)
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
              expectType<TestReject | undefined>(action.payload)
            },
            settled(state, action) {
              expectType<TestState>(state)
              expectType<TestArg>(action.meta.arg)
              if (isRejected(action)) {
                expectType<SerializedError>(action.error)
                expectType<TestReject | undefined>(action.payload)
              } else {
                expectType<TestReturned>(action.payload)
              }
            },
          }
        ),
      }
    },
  })

  const store = configureStore({ reducer: { test: slice.reducer } })

  type StoreState = ReturnType<typeof store.getState>
  type StoreDispatch = typeof store.dispatch

  expectType<PayloadActionCreator<string>>(slice.actions.normalReducer)
  slice.actions.normalReducer('')
  // @ts-expect-error
  slice.actions.normalReducer()
  // @ts-expect-error
  slice.actions.normalReducer(0)
  expectType<ActionCreatorWithOptionalPayload<string | undefined>>(
    slice.actions.optionalReducer
  )
  slice.actions.optionalReducer()
  slice.actions.optionalReducer('')
  // @ts-expect-error
  slice.actions.optionalReducer(0)

  expectType<ActionCreatorWithoutPayload>(slice.actions.noActionReducer)
  slice.actions.noActionReducer()
  // @ts-expect-error
  slice.actions.noActionReducer('')
  expectType<
    ActionCreatorWithPreparedPayload<
      [string],
      string,
      'test/preparedReducer',
      'error',
      'meta'
    >
  >(slice.actions.preparedReducer)
  expectType<AsyncThunk<TestReturned, TestArg, {}>>(slice.actions.testInfer)
  expectType<AsyncThunk<TestReturned, TestArg, { rejectValue: TestReject }>>(
    slice.actions.testExplicitType
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

/** Test: wrapping createSlice should be possible, with callback */
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
    reducers,
  }: {
    name: string
    initialState: GenericState<T>
    reducers: (create: ReducerCreators<GenericState<T>>) => Reducers
  }) => {
    return createSlice({
      name,
      initialState,
      reducers: (create) => ({
        start: create.reducer((state) => {
          state.status = 'loading'
        }),
        success: create.reducer<T>((state, action) => {
          state.data = castDraft(action.payload)
          state.status = 'finished'
        }),
        ...reducers(create),
      }),
    })
  }

  const wrappedSlice = createGenericSlice({
    name: 'test',
    initialState: { status: 'loading' } as GenericState<string>,
    reducers: (create) => ({
      magic: create.reducer((state) => {
        expectType<GenericState<string>>(state)
        // @ts-expect-error
        expectType<GenericState<number>>(state)

        state.status = 'finished'
        state.data = 'hocus pocus'
      }),
    }),
  })

  expectType<ActionCreatorWithPayload<string>>(wrappedSlice.actions.success)
  expectType<ActionCreatorWithoutPayload<string>>(wrappedSlice.actions.magic)
}

/**
 * Test: selectSlice
 */
{
  expectType<number>(counterSlice.selectSlice({ counter: 0 }))
  // @ts-expect-error
  counterSlice.selectSlice({})
}

/**
 * Test: buildCreateSlice
 */
{
  expectExactType(createSlice)(buildCreateSlice())
  buildCreateSlice({
    // @ts-expect-error not possible to recreate shape because symbol is not exported
    creators: { asyncThunk: { [Symbol()]: createAsyncThunk } },
  })
  buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })
}
