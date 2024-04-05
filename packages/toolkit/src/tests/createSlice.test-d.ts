import type {
  Action,
  ActionCreatorWithNonInferrablePayload,
  ActionCreatorWithOptionalPayload,
  ActionCreatorWithPayload,
  ActionCreatorWithPreparedPayload,
  ActionCreatorWithoutPayload,
  ActionReducerMapBuilder,
  CreatorCaseReducers,
  PayloadAction,
  PayloadActionCreator,
  Reducer,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  ReducerHandlingContext,
  SliceActionType,
  SliceCaseReducers,
  ThunkAction,
  UnknownAction,
  ValidateSliceCaseReducers,
} from '@reduxjs/toolkit'
import {
  asyncThunkCreator,
  buildCreateSlice,
  configureStore,
  createAction,
  createAsyncThunk,
  createSlice,
  nanoid,
} from '@reduxjs/toolkit'
import { castDraft } from 'immer'

const toasterCreatorType = Symbol()

describe('type tests', () => {
  const counterSlice = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: (state: number, action) => state + action.payload,
      decrement: (state: number, action) => state - action.payload,
    },
  })

  test('Slice name is strongly typed.', () => {
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

    expectTypeOf(counterSlice.actions).toEqualTypeOf(actionCreators.counter)

    expectTypeOf(uiSlice.actions).toEqualTypeOf(actionCreators.ui)

    expectTypeOf(actionCreators).not.toHaveProperty('anyKey')
  })

  test("createSlice() infers the returned slice's type.", () => {
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
          (state, action) => state + action.payload.count,
        )
      },
    })

    test('Reducer', () => {
      expectTypeOf(slice.reducer).toMatchTypeOf<
        Reducer<number, PayloadAction>
      >()

      expectTypeOf(slice.reducer).not.toMatchTypeOf<
        Reducer<string, PayloadAction>
      >()
    })

    test('Actions', () => {
      slice.actions.increment(1)
      slice.actions.decrement(1)

      expectTypeOf(slice.actions).not.toHaveProperty('other')
    })
  })

  test('Slice action creator types are inferred.', () => {
    const counter = createSlice({
      name: 'counter',
      initialState: 0,
      reducers: {
        increment: (state) => state + 1,
        decrement: (
          state,
          { payload = 1 }: PayloadAction<number | undefined>,
        ) => state - payload,
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

    expectTypeOf(
      counter.actions.increment,
    ).toMatchTypeOf<ActionCreatorWithoutPayload>()

    counter.actions.increment()

    expectTypeOf(counter.actions.decrement).toMatchTypeOf<
      ActionCreatorWithOptionalPayload<number | undefined>
    >()

    counter.actions.decrement()
    counter.actions.decrement(2)

    expectTypeOf(counter.actions.multiply).toMatchTypeOf<
      ActionCreatorWithPayload<number | number[]>
    >()

    counter.actions.multiply(2)
    counter.actions.multiply([2, 3, 4])

    expectTypeOf(counter.actions.addTwo).toMatchTypeOf<
      ActionCreatorWithPreparedPayload<[number, number], number>
    >()

    counter.actions.addTwo(1, 2)

    expectTypeOf(counter.actions.multiply).parameters.not.toMatchTypeOf<[]>()

    expectTypeOf(counter.actions.multiply).parameter(0).not.toBeString()

    expectTypeOf(counter.actions.addTwo).parameters.not.toMatchTypeOf<
      [number]
    >()

    expectTypeOf(counter.actions.addTwo).parameters.toEqualTypeOf<
      [number, number]
    >()
  })

  test('Slice action creator types properties are strongly typed', () => {
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

    expectTypeOf(
      counter.actions.increment.type,
    ).toEqualTypeOf<'counter/increment'>()

    expectTypeOf(
      counter.actions.increment().type,
    ).toEqualTypeOf<'counter/increment'>()

    expectTypeOf(
      counter.actions.decrement.type,
    ).toEqualTypeOf<'counter/decrement'>()

    expectTypeOf(
      counter.actions.decrement().type,
    ).toEqualTypeOf<'counter/decrement'>()

    expectTypeOf(
      counter.actions.multiply.type,
    ).toEqualTypeOf<'counter/multiply'>()

    expectTypeOf(
      counter.actions.multiply(1).type,
    ).toEqualTypeOf<'counter/multiply'>()

    expectTypeOf(
      counter.actions.increment.type,
    ).not.toMatchTypeOf<'increment'>()
  })

  test('Slice action creator types are inferred for enhanced reducers.', () => {
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

    expectTypeOf(
      counter.actions.incrementByStrLen('test').type,
    ).toEqualTypeOf<'test/incrementByStrLen'>()

    expectTypeOf(counter.actions.incrementByStrLen('test').payload).toBeNumber()

    expectTypeOf(counter.actions.concatMetaStrLen('test').payload).toBeString()

    expectTypeOf(counter.actions.concatMetaStrLen('test').meta).toBeNumber()

    expectTypeOf(
      counter.actions.incrementByStrLen('test').payload,
    ).not.toBeString()

    expectTypeOf(counter.actions.concatMetaStrLen('test').meta).not.toBeString()
  })

  test('access meta and error from reducer', () => {
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
          reducer(
            _,
            action: PayloadAction<number, string, unknown, unknown>,
          ) {},
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
  })

  test('returned case reducer has the correct type', () => {
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

    test('Should match positively', () => {
      expectTypeOf(counter.caseReducers.increment).toMatchTypeOf<
        (state: number, action: PayloadAction<number>) => number | void
      >()
    })

    test('Should match positively for reducers with prepare callback', () => {
      expectTypeOf(counter.caseReducers.decrement).toMatchTypeOf<
        (state: number, action: PayloadAction<number>) => number | void
      >()
    })

    test("Should not mismatch the payload if it's a simple reducer", () => {
      expectTypeOf(counter.caseReducers.increment).not.toMatchTypeOf<
        (state: number, action: PayloadAction<string>) => number | void
      >()
    })

    test("Should not mismatch the payload if it's a reducer with a prepare callback", () => {
      expectTypeOf(counter.caseReducers.decrement).not.toMatchTypeOf<
        (state: number, action: PayloadAction<string>) => number | void
      >()
    })

    test("Should not include entries that don't exist", () => {
      expectTypeOf(counter.caseReducers).not.toHaveProperty(
        'someThingNonExistent',
      )
    })
  })

  test('prepared payload does not match action payload - should cause an error.', () => {
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
  })

  test('if no Payload Type is specified, accept any payload', () => {
    // see https://github.com/reduxjs/redux-toolkit/issues/165

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

    expectTypeOf(
      mySlice.actions.setName,
    ).toMatchTypeOf<ActionCreatorWithNonInferrablePayload>()

    const x = mySlice.actions.setName

    mySlice.actions.setName(null)
    mySlice.actions.setName('asd')
    mySlice.actions.setName(5)
  })

  test('actions.x.match()', () => {
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
      expectTypeOf(x.type).toEqualTypeOf<'name/setName'>()

      expectTypeOf(x.payload).toBeString()
    } else {
      expectTypeOf(x.type).not.toMatchTypeOf<'name/setName'>()

      expectTypeOf(x).not.toHaveProperty('payload')
    }
  })

  test('builder callback for extraReducers', () => {
    createSlice({
      name: 'test',
      initialState: 0,
      reducers: {},
      extraReducers: (builder) => {
        expectTypeOf(builder).toEqualTypeOf<ActionReducerMapBuilder<number>>()
      },
    })
  })

  test('wrapping createSlice should be possible', () => {
    interface GenericState<T> {
      data?: T
      status: 'loading' | 'finished' | 'error'
    }

    const createGenericSlice = <
      T,
      Reducers extends SliceCaseReducers<GenericState<T>>,
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
          expectTypeOf(state).toEqualTypeOf<GenericState<string>>()

          expectTypeOf(state).not.toMatchTypeOf<GenericState<number>>()

          state.status = 'finished'
          state.data = 'hocus pocus'
        },
      },
    })

    expectTypeOf(wrappedSlice.actions.success).toMatchTypeOf<
      ActionCreatorWithPayload<string>
    >()

    expectTypeOf(wrappedSlice.actions.magic).toMatchTypeOf<
      ActionCreatorWithoutPayload<string>
    >()
  })

  test('extraReducers', () => {
    interface GenericState<T> {
      data: T | null
    }

    function createDataSlice<
      T,
      Reducers extends SliceCaseReducers<GenericState<T>>,
    >(
      name: string,
      reducers: ValidateSliceCaseReducers<GenericState<T>, Reducers>,
      initialState: GenericState<T>,
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
  })

  test('slice selectors', () => {
    const sliceWithoutSelectors = createSlice({
      name: '',
      initialState: '',
      reducers: {},
    })

    expectTypeOf(sliceWithoutSelectors.selectors).not.toHaveProperty('foo')

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
          { static: true },
        ),
      },
    })

    const rootState = {
      [sliceWithSelectors.reducerPath]: sliceWithSelectors.getInitialState(),
    }

    const { selectValue, selectMultiply, selectToFixed } =
      sliceWithSelectors.selectors

    expectTypeOf(selectValue(rootState)).toBeNumber()

    expectTypeOf(selectMultiply(rootState, 2)).toBeNumber()

    expectTypeOf(selectToFixed(rootState)).toBeString()

    expectTypeOf(selectToFixed.unwrapped.static).toBeBoolean()

    const nestedState = {
      nested: rootState,
    }

    const nestedSelectors = sliceWithSelectors.getSelectors(
      (rootState: typeof nestedState) => rootState.nested.counter,
    )

    expectTypeOf(nestedSelectors.selectValue(nestedState)).toBeNumber()

    expectTypeOf(nestedSelectors.selectMultiply(nestedState, 2)).toBeNumber()

    expectTypeOf(nestedSelectors.selectToFixed(nestedState)).toBeString()
  })

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

    const slice = createSlice({
      name: 'test',
      initialState: {} as TestState,
      reducers: (create) => ({
        normalReducer: create.reducer<string>((state, action) => {
          expectTypeOf(state).toEqualTypeOf<TestState>()

          expectTypeOf(action.payload).toBeString()
        }),
        optionalReducer: create.reducer<string | undefined>((state, action) => {
          expectTypeOf(state).toEqualTypeOf<TestState>()

          expectTypeOf(action.payload).toEqualTypeOf<string | undefined>()
        }),
        noActionReducer: create.reducer((state) => {
          expectTypeOf(state).toEqualTypeOf<TestState>()
        }),
        preparedReducer: create.preparedReducer(
          (payload: string) => ({
            payload,
            meta: 'meta' as const,
            error: 'error' as const,
          }),
          (state, action) => {
            expectTypeOf(state).toEqualTypeOf<TestState>()

            expectTypeOf(action.payload).toBeString()

            expectTypeOf(action.meta).toEqualTypeOf<'meta'>()

            expectTypeOf(action.error).toEqualTypeOf<'error'>()
          },
        ),
      }),
    })

    const store = configureStore({ reducer: { test: slice.reducer } })

    type StoreState = ReturnType<typeof store.getState>

    type StoreDispatch = typeof store.dispatch

    expectTypeOf(slice.actions.normalReducer).toMatchTypeOf<
      PayloadActionCreator<string>
    >()

    expectTypeOf(slice.actions.normalReducer).toBeCallableWith('')

    expectTypeOf(slice.actions.normalReducer).parameters.not.toMatchTypeOf<[]>()

    expectTypeOf(slice.actions.normalReducer).parameters.not.toMatchTypeOf<
      [number]
    >()

    expectTypeOf(slice.actions.optionalReducer).toMatchTypeOf<
      ActionCreatorWithOptionalPayload<string | undefined>
    >()

    expectTypeOf(slice.actions.optionalReducer).toBeCallableWith()

    expectTypeOf(slice.actions.optionalReducer).toBeCallableWith('')

    expectTypeOf(slice.actions.optionalReducer).parameter(0).not.toBeNumber()

    expectTypeOf(
      slice.actions.noActionReducer,
    ).toMatchTypeOf<ActionCreatorWithoutPayload>()

    expectTypeOf(slice.actions.noActionReducer).toBeCallableWith()

    expectTypeOf(slice.actions.noActionReducer).parameter(0).not.toBeString()

    expectTypeOf(slice.actions.preparedReducer).toEqualTypeOf<
      ActionCreatorWithPreparedPayload<
        [string],
        string,
        'test/preparedReducer',
        'error',
        'meta'
      >
    >()
  })

  test('wrapping createSlice should be possible, with callback', () => {
    interface GenericState<T> {
      data?: T
      status: 'loading' | 'finished' | 'error'
    }

    const createGenericSlice = <
      T,
      Reducers extends Record<string, ReducerDefinition>,
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
          expectTypeOf(state).toEqualTypeOf<GenericState<string>>()

          expectTypeOf(state).not.toMatchTypeOf<GenericState<number>>()

          state.status = 'finished'
          state.data = 'hocus pocus'
        }),
      }),
    })

    expectTypeOf(wrappedSlice.actions.success).toMatchTypeOf<
      ActionCreatorWithPayload<string>
    >()

    expectTypeOf(wrappedSlice.actions.magic).toMatchTypeOf<
      ActionCreatorWithoutPayload<string>
    >()
  })

  test('selectSlice', () => {
    expectTypeOf(counterSlice.selectSlice({ counter: 0 })).toBeNumber()

    // We use `not.toEqualTypeOf` instead of `not.toMatchTypeOf`
    // because `toMatchTypeOf` allows missing properties
    expectTypeOf(counterSlice.selectSlice).parameter(0).not.toEqualTypeOf<{}>()
  })

  test('buildCreateSlice', () => {
    expectTypeOf(buildCreateSlice()).toEqualTypeOf(createSlice)

    buildCreateSlice({
      // @ts-expect-error not possible to recreate shape because symbol is not exported
      creators: { asyncThunk: { [Symbol()]: createAsyncThunk } },
    })
    buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })
  })
  test('Default `createSlice` should not allow `create.asyncThunk()`, but it should allow `create.reducer()` and `create.preparedReducer()`', () => {
    const sliceWithoutAsyncThunks = createSlice({
      name: 'counter',
      initialState: {
        value: 0,
        status: 'idle',
      },
      reducers: (create) => {
        expectTypeOf(create).not.toHaveProperty('asyncThunk')
        return {
          increment: create.reducer((state) => {
            state.value += 1
          }),

          incrementByAmount: create.preparedReducer(
            (payload: number) => ({ payload }),
            (state, action: PayloadAction<number>) => {
              state.value += action.payload
            },
          ),
        }
      },
    })
  })
  test('creators can disable themselves if state is incompatible', () => {
    const toastCreator: ReducerCreator<typeof toasterCreatorType> = {
      type: toasterCreatorType,
      create: () => ({
        _reducerDefinitionType: toasterCreatorType,
      }),
      handle({ type, reducerName }, _definition, context) {
        const toastOpened = createAction<{ message: string; id: string }>(
          type + '/opened',
        )
        const toastClosed = createAction<string>(type + '/closed')
        function openToast(
          ms: number,
          message: string,
        ): ThunkAction<void, unknown, unknown, UnknownAction> {
          return (dispatch, getState) => {
            const id = nanoid()
            dispatch(toastOpened({ message, id }))
            setTimeout(() => {
              dispatch(toastClosed(id))
            }, ms)
          }
        }
        Object.assign(openToast, { toastOpened, toastClosed })
        ;(context as any as ReducerHandlingContext<ToastState>)
          .addCase(toastOpened, (state, { payload: { message, id } }) => {
            state.toasts[id] = { message }
          })
          .addCase(toastClosed, (state, action) => {
            delete state.toasts[action.payload]
          })
          .exposeAction(openToast)
      },
    }

    const createAppSlice = buildCreateSlice({
      creators: { toaster: toastCreator },
    })

    const toastSlice = createAppSlice({
      name: 'toasts',
      initialState: { toasts: {} } as ToastState,
      reducers: (create) => ({
        toast: create.toaster(),
      }),
    })

    expectTypeOf(toastSlice.actions.toast).toEqualTypeOf<
      AddToastThunk<'toasts', 'toast'>
    >()

    expectTypeOf(toastSlice.actions.toast).toBeCallableWith(100, 'hello')

    expectTypeOf(
      toastSlice.actions.toast.toastOpened.type,
    ).toEqualTypeOf<'toasts/toast/opened'>()

    const incompatibleSlice = createAppSlice({
      name: 'incompatible',
      initialState: {},
      reducers: (create) => {
        expectTypeOf(create).not.toHaveProperty('toaster')
        return {}
      },
    })
  })
})

interface Toast {
  message: string
}

interface ToastState {
  toasts: Record<string, Toast>
}

interface AddToastThunk<Name extends string, ReducerName extends PropertyKey> {
  (
    ms: number,
    message: string,
  ): ThunkAction<void, unknown, unknown, UnknownAction>
  toastOpened: PayloadActionCreator<
    { message: string; id: string },
    `${SliceActionType<Name, ReducerName>}/opened`
  >
  toastClosed: PayloadActionCreator<
    string,
    `${SliceActionType<Name, ReducerName>}/closed`
  >
}

declare module '@reduxjs/toolkit' {
  export interface SliceReducerCreators<
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
  > {
    [toasterCreatorType]: ReducerCreatorEntry<
      State extends ToastState
        ? () => ReducerDefinition<typeof toasterCreatorType>
        : never,
      {
        actions: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof toasterCreatorType
          >
            ? AddToastThunk<Name, ReducerName>
            : never
        }
      }
    >
  }
}
