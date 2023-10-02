/* eslint-disable no-lone-blocks */
import type {
  Dispatch,
  UnknownAction,
  Middleware,
  Reducer,
  Store,
  Action,
  StoreEnhancer,
} from 'redux'
import { applyMiddleware, combineReducers } from 'redux'
import type { PayloadAction, ConfigureStoreOptions } from '@reduxjs/toolkit'
import { configureStore, createSlice, Tuple } from '@reduxjs/toolkit'
import type { ThunkMiddleware, ThunkAction, ThunkDispatch } from 'redux-thunk'
import { thunk } from 'redux-thunk'
import { expectNotAny, expectType } from './helpers'

const _anyMiddleware: any = () => () => () => {}

/*
 * Test: configureStore() requires a valid reducer or reducer map.
 */
{
  configureStore({
    reducer: (state, action) => 0,
  })

  configureStore({
    reducer: {
      counter1: () => 0,
      counter2: () => 1,
    },
  })

  // @ts-expect-error
  configureStore({ reducer: 'not a reducer' })

  // @ts-expect-error
  configureStore({ reducer: { a: 'not a reducer' } })

  // @ts-expect-error
  configureStore({})
}

/*
 * Test: configureStore() infers the store state type.
 */
{
  const reducer: Reducer<number> = () => 0
  const store = configureStore({ reducer })
  const numberStore: Store<number, UnknownAction> = store

  // @ts-expect-error
  const stringStore: Store<string, UnknownAction> = store
}

/*
 * Test: configureStore() infers the store action type.
 */
{
  const reducer: Reducer<number, PayloadAction<number>> = () => 0
  const store = configureStore({ reducer })
  const numberStore: Store<number, PayloadAction<number>> = store

  // @ts-expect-error
  const stringStore: Store<number, PayloadAction<string>> = store
}

/*
 * Test: configureStore() accepts Tuple, but not plain array.
 */
{
  const middleware: Middleware = (store) => (next) => next

  configureStore({
    reducer: () => 0,
    middleware: () => new Tuple(middleware),
  })

  configureStore({
    reducer: () => 0,
    // @ts-expect-error
    middleware: () => [middleware],
  })

  configureStore({
    reducer: () => 0,
    // @ts-expect-error
    middleware: () => new Tuple('not middleware'),
  })
}

/*
 * Test: configureStore() accepts devTools flag.
 */
{
  configureStore({
    reducer: () => 0,
    devTools: true,
  })

  configureStore({
    reducer: () => 0,
    // @ts-expect-error
    devTools: 'true',
  })
}

/*
 * Test: configureStore() accepts devTools EnhancerOptions.
 */
{
  configureStore({
    reducer: () => 0,
    devTools: { name: 'myApp' },
  })

  configureStore({
    reducer: () => 0,
    // @ts-expect-error
    devTools: { appname: 'myApp' },
  })
}

/*
 * Test: configureStore() accepts preloadedState.
 */
{
  configureStore({
    reducer: () => 0,
    preloadedState: 0,
  })

  configureStore({
    // @ts-expect-error
    reducer: (_: number) => 0,
    preloadedState: 'non-matching state type',
  })
}

/*
 * Test: configureStore() accepts store Tuple, but not plain array
 */
{
  {
    const enhancer = applyMiddleware(() => (next) => next)

    const store = configureStore({
      reducer: () => 0,
      enhancers: () => new Tuple(enhancer),
    })

    const store2 = configureStore({
      reducer: () => 0,
      // @ts-expect-error
      enhancers: () => [enhancer],
    })

    expectType<Dispatch & ThunkDispatch<number, undefined, UnknownAction>>(
      store.dispatch
    )
  }

  configureStore({
    reducer: () => 0,
    // @ts-expect-error
    enhancers: () => new Tuple('not a store enhancer'),
  })

  {
    const somePropertyStoreEnhancer: StoreEnhancer<{ someProperty: string }> = (
      next
    ) => {
      return (reducer, preloadedState) => {
        return {
          ...next(reducer, preloadedState),
          someProperty: 'some value',
        }
      }
    }

    const anotherPropertyStoreEnhancer: StoreEnhancer<{
      anotherProperty: number
    }> = (next) => {
      return (reducer, preloadedState) => {
        return {
          ...next(reducer, preloadedState),
          anotherProperty: 123,
        }
      }
    }

    const store = configureStore({
      reducer: () => 0,
      enhancers: () =>
        new Tuple(somePropertyStoreEnhancer, anotherPropertyStoreEnhancer),
    })

    expectType<Dispatch>(store.dispatch)
    expectType<string>(store.someProperty)
    expectType<number>(store.anotherProperty)

    const storeWithCallback = configureStore({
      reducer: () => 0,
      enhancers: (getDefaultEnhancers) =>
        getDefaultEnhancers()
          .prepend(anotherPropertyStoreEnhancer)
          .concat(somePropertyStoreEnhancer),
    })

    expectType<Dispatch & ThunkDispatch<number, undefined, UnknownAction>>(
      store.dispatch
    )
    expectType<string>(storeWithCallback.someProperty)
    expectType<number>(storeWithCallback.anotherProperty)
  }

  {
    const someStateExtendingEnhancer: StoreEnhancer<
      {},
      { someProperty: string }
    > =
      (next) =>
      (...args) => {
        const store = next(...args)
        const getState = () => ({
          ...store.getState(),
          someProperty: 'some value',
        })
        return {
          ...store,
          getState,
        } as any
      }

    const anotherStateExtendingEnhancer: StoreEnhancer<
      {},
      { anotherProperty: number }
    > =
      (next) =>
      (...args) => {
        const store = next(...args)
        const getState = () => ({
          ...store.getState(),
          anotherProperty: 123,
        })
        return {
          ...store,
          getState,
        } as any
      }

    const store = configureStore({
      reducer: () => ({ aProperty: 0 }),
      enhancers: () =>
        new Tuple(someStateExtendingEnhancer, anotherStateExtendingEnhancer),
    })

    const state = store.getState()
    expectType<number>(state.aProperty)
    expectType<string>(state.someProperty)
    expectType<number>(state.anotherProperty)

    const storeWithCallback = configureStore({
      reducer: () => ({ aProperty: 0 }),
      enhancers: (gDE) =>
        gDE().concat(someStateExtendingEnhancer, anotherStateExtendingEnhancer),
    })

    const stateWithCallback = storeWithCallback.getState()

    expectType<number>(stateWithCallback.aProperty)
    expectType<string>(stateWithCallback.someProperty)
    expectType<number>(stateWithCallback.anotherProperty)
  }
}

/**
 * Test: Preloaded state typings
 */
{
  let counterReducer1: Reducer<number> = () => 0
  let counterReducer2: Reducer<number> = () => 0

  /**
   * Test: partial preloaded state
   */
  {
    const store = configureStore({
      reducer: {
        counter1: counterReducer1,
        counter2: counterReducer2,
      },
      preloadedState: {
        counter1: 0,
      },
    })

    const counter1: number = store.getState().counter1
    const counter2: number = store.getState().counter2
  }

  /**
   * Test: empty preloaded state
   */
  {
    const store = configureStore({
      reducer: {
        counter1: counterReducer1,
        counter2: counterReducer2,
      },
      preloadedState: {},
    })

    const counter1: number = store.getState().counter1
    const counter2: number = store.getState().counter2
  }

  /**
   * Test: excess properties in preloaded state
   */
  {
    const store = configureStore({
      reducer: {
        // @ts-expect-error
        counter1: counterReducer1,
        counter2: counterReducer2,
      },
      preloadedState: {
        counter1: 0,
        counter3: 5,
      },
    })

    const counter1: number = store.getState().counter1
    const counter2: number = store.getState().counter2
  }

  /**
   * Test: mismatching properties in preloaded state
   */
  {
    const store = configureStore({
      reducer: {
        // @ts-expect-error
        counter1: counterReducer1,
        counter2: counterReducer2,
      },
      preloadedState: {
        counter3: 5,
      },
    })

    const counter1: number = store.getState().counter1
    const counter2: number = store.getState().counter2
  }

  /**
   * Test: string preloaded state when expecting object
   */
  {
    const store = configureStore({
      reducer: {
        // @ts-expect-error
        counter1: counterReducer1,
        counter2: counterReducer2,
      },
      preloadedState: 'test',
    })

    const counter1: number = store.getState().counter1
    const counter2: number = store.getState().counter2
  }

  /**
   * Test: nested combineReducers allows partial
   */
  {
    const store = configureStore({
      reducer: {
        group1: combineReducers({
          counter1: counterReducer1,
          counter2: counterReducer2,
        }),
        group2: combineReducers({
          counter1: counterReducer1,
          counter2: counterReducer2,
        }),
      },
      preloadedState: {
        group1: {
          counter1: 5,
        },
      },
    })

    const group1counter1: number = store.getState().group1.counter1
    const group1counter2: number = store.getState().group1.counter2
    const group2counter1: number = store.getState().group2.counter1
    const group2counter2: number = store.getState().group2.counter2
  }

  /**
   * Test: non-nested combineReducers does not allow partial
   */
  {
    interface GroupState {
      counter1: number
      counter2: number
    }

    const initialState = { counter1: 0, counter2: 0 }

    const group1Reducer: Reducer<GroupState> = (state = initialState) => state
    const group2Reducer: Reducer<GroupState> = (state = initialState) => state

    const store = configureStore({
      reducer: {
        // @ts-expect-error
        group1: group1Reducer,
        group2: group2Reducer,
      },
      preloadedState: {
        group1: {
          counter1: 5,
        },
      },
    })

    const group1counter1: number = store.getState().group1.counter1
    const group1counter2: number = store.getState().group1.counter2
    const group2counter1: number = store.getState().group2.counter1
    const group2counter2: number = store.getState().group2.counter2
  }
}

/**
 * Test: Dispatch typings
 */
{
  type StateA = number
  const reducerA = () => 0
  function thunkA() {
    return (() => {}) as any as ThunkAction<Promise<'A'>, StateA, any, any>
  }

  type StateB = string
  function thunkB() {
    return (dispatch: Dispatch, getState: () => StateB) => {}
  }
  /**
   * Test: by default, dispatching Thunks is possible
   */
  {
    const store = configureStore({
      reducer: reducerA,
    })

    store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())

    const res = store.dispatch((dispatch, getState) => {
      return 42
    })

    const action = store.dispatch({ type: 'foo' })
  }
  /**
   * Test: return type of thunks and actions is inferred correctly
   */
  {
    const slice = createSlice({
      name: 'counter',
      initialState: {
        value: 0,
      },
      reducers: {
        incrementByAmount: (state, action: PayloadAction<number>) => {
          state.value += action.payload
        },
      },
    })

    const store = configureStore({
      reducer: {
        counter: slice.reducer,
      },
    })

    const action = slice.actions.incrementByAmount(2)

    const dispatchResult = store.dispatch(action)
    expectType<{ type: string; payload: number }>(dispatchResult)

    const promiseResult = store.dispatch(async (dispatch) => {
      return 42
    })

    expectType<Promise<number>>(promiseResult)

    const store2 = configureStore({
      reducer: {
        counter: slice.reducer,
      },
      middleware: (gDM) =>
        gDM({
          thunk: {
            extraArgument: 42,
          },
        }),
    })

    const dispatchResult2 = store2.dispatch(action)
    expectType<{ type: string; payload: number }>(dispatchResult2)
  }
  /**
   * Test: removing the Thunk Middleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: () => new Tuple(),
    })
    // @ts-expect-error
    store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: adding the thunk middleware by hand
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: () => new Tuple(thunk as ThunkMiddleware<StateA>),
    })
    store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: custom middleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: () =>
        new Tuple(0 as unknown as Middleware<(a: StateA) => boolean, StateA>),
    })
    const result: boolean = store.dispatch(5)
    // @ts-expect-error
    const result2: string = store.dispatch(5)
  }
  /**
   * Test: multiple custom middleware
   */
  {
    const middleware = [] as any as Tuple<
      [
        Middleware<(a: 'a') => 'A', StateA>,
        Middleware<(b: 'b') => 'B', StateA>,
        ThunkMiddleware<StateA>
      ]
    >
    const store = configureStore({
      reducer: reducerA,
      middleware: () => middleware,
    })

    const result: 'A' = store.dispatch('a')
    const result2: 'B' = store.dispatch('b')
    const result3: Promise<'A'> = store.dispatch(thunkA())
  }
  /**
   * Accepts thunk with `unknown`, `undefined` or `null` ThunkAction extraArgument per default
   */
  {
    const store = configureStore({ reducer: {} })
    // undefined is the default value for the ThunkMiddleware extraArgument
    store.dispatch(function () {} as ThunkAction<
      void,
      {},
      undefined,
      UnknownAction
    >)
    // `null` for the `extra` generic was previously documented in the RTK "Advanced Tutorial", but
    // is a bad pattern and users should use `unknown` instead
    // @ts-expect-error
    store.dispatch(function () {} as ThunkAction<void, {}, null, UnknownAction>)
    // unknown is the best way to type a ThunkAction if you do not care
    // about the value of the extraArgument, as it will always work with every
    // ThunkMiddleware, no matter the actual extraArgument type
    store.dispatch(function () {} as ThunkAction<
      void,
      {},
      unknown,
      UnknownAction
    >)
    // @ts-expect-error
    store.dispatch(function () {} as ThunkAction<
      void,
      {},
      boolean,
      UnknownAction
    >)
  }

  /**
   * Test: custom middleware and getDefaultMiddleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: (gDM) =>
        gDM().prepend((() => {}) as any as Middleware<(a: 'a') => 'A', StateA>),
    })

    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: custom middleware and getDefaultMiddleware, using prepend
   */
  {
    const otherMiddleware: Middleware<(a: 'a') => 'A', StateA> = _anyMiddleware

    const store = configureStore({
      reducer: reducerA,
      middleware: (gDM) => {
        const concatenated = gDM().prepend(otherMiddleware)
        expectType<
          ReadonlyArray<
            typeof otherMiddleware | ThunkMiddleware | Middleware<{}>
          >
        >(concatenated)

        return concatenated
      },
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: custom middleware and getDefaultMiddleware, using concat
   */
  {
    const otherMiddleware: Middleware<(a: 'a') => 'A', StateA> = _anyMiddleware

    const store = configureStore({
      reducer: reducerA,
      middleware: (gDM) => {
        const concatenated = gDM().concat(otherMiddleware)

        expectType<
          ReadonlyArray<
            typeof otherMiddleware | ThunkMiddleware | Middleware<{}>
          >
        >(concatenated)
        return concatenated
      },
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: middlewareBuilder notation, getDefaultMiddleware (unconfigured)
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend((() => {}) as any as Middleware<
          (a: 'a') => 'A',
          StateA
        >),
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // @ts-expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: middlewareBuilder notation, getDefaultMiddleware, concat & prepend
   */
  {
    const otherMiddleware: Middleware<(a: 'a') => 'A', StateA> = _anyMiddleware
    const otherMiddleware2: Middleware<(a: 'b') => 'B', StateA> = _anyMiddleware
    const store = configureStore({
      reducer: reducerA,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
          .concat(otherMiddleware)
          .prepend(otherMiddleware2),
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    const result3: 'B' = store.dispatch('b')
    // @ts-expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: middlewareBuilder notation, getDefaultMiddleware (thunk: false)
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ thunk: false }).prepend(
          (() => {}) as any as Middleware<(a: 'a') => 'A', StateA>
        ),
    })
    const result1: 'A' = store.dispatch('a')
    // @ts-expect-error
    store.dispatch(thunkA())
  }

  /**
   * Test: badly typed middleware won't make `dispatch` `any`
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(_anyMiddleware as Middleware<any>),
    })

    expectNotAny(store.dispatch)
  }

  /**
   * Test: decorated `configureStore` won't make `dispatch` `never`
   */
  {
    const someSlice = createSlice({
      name: 'something',
      initialState: null as any,
      reducers: {
        set(state) {
          return state
        },
      },
    })

    function configureMyStore<S>(
      options: Omit<ConfigureStoreOptions<S>, 'reducer'>
    ) {
      return configureStore({
        ...options,
        reducer: someSlice.reducer,
      })
    }

    const store = configureMyStore({})

    expectType<Function>(store.dispatch)
  }

  {
    interface CounterState {
      value: number
    }

    const counterSlice = createSlice({
      name: 'counter',
      initialState: { value: 0 } as CounterState,
      reducers: {
        increment(state) {
          state.value += 1
        },
        decrement(state) {
          state.value -= 1
        },
        // Use the PayloadAction type to declare the contents of `action.payload`
        incrementByAmount: (state, action: PayloadAction<number>) => {
          state.value += action.payload
        },
      },
    })

    type Unsubscribe = () => void

    // A fake middleware that tells TS that an unsubscribe callback is being returned for a given action
    // This is the same signature that the "listener" middleware uses
    const dummyMiddleware: Middleware<
      {
        (action: Action<'actionListenerMiddleware/add'>): Unsubscribe
      },
      CounterState
    > = (storeApi) => (next) => (action) => {}

    const store = configureStore({
      reducer: counterSlice.reducer,
      middleware: (gDM) => gDM().prepend(dummyMiddleware),
    })

    // Order matters here! We need the listener type to come first, otherwise
    // the thunk middleware type kicks in and TS thinks a plain action is being returned
    expectType<
      ((action: Action<'actionListenerMiddleware/add'>) => Unsubscribe) &
        ThunkDispatch<CounterState, undefined, UnknownAction> &
        Dispatch<UnknownAction>
    >(store.dispatch)

    const unsubscribe = store.dispatch({
      type: 'actionListenerMiddleware/add',
    } as const)

    expectType<Unsubscribe>(unsubscribe)
  }
}
