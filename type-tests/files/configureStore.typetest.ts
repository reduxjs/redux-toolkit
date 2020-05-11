import {
  applyMiddleware,
  Dispatch,
  AnyAction,
  Middleware,
  Reducer,
  Store
} from 'redux'
import { configureStore, PayloadAction, getDefaultMiddleware } from 'src'
import thunk, { ThunkMiddleware, ThunkAction, ThunkDispatch } from 'redux-thunk'

/*
 * Test: configureStore() requires a valid reducer or reducer map.
 */
{
  configureStore({
    reducer: (state, action) => 0
  })

  configureStore({
    reducer: {
      counter1: () => 0,
      counter2: () => 1
    }
  })

  // typings:expect-error
  configureStore({ reducer: 'not a reducer' })

  // typings:expect-error
  configureStore({ reducer: { a: 'not a reducer' } })

  // typings:expect-error
  configureStore({})
}

/*
 * Test: configureStore() infers the store state type.
 */
{
  const reducer: Reducer<number> = () => 0
  const store = configureStore({ reducer })
  const numberStore: Store<number, AnyAction> = store

  // typings:expect-error
  const stringStore: Store<string, AnyAction> = store
}

/*
 * Test: configureStore() infers the store action type.
 */
{
  const reducer: Reducer<number, PayloadAction<number>> = () => 0
  const store = configureStore({ reducer })
  const numberStore: Store<number, PayloadAction<number>> = store

  // typings:expect-error
  const stringStore: Store<number, PayloadAction<string>> = store
}

/*
 * Test: configureStore() accepts middleware array.
 */
{
  const middleware: Middleware = store => next => next

  configureStore({
    reducer: () => 0,
    middleware: [middleware]
  })

  // typings:expect-error
  configureStore({
    reducer: () => 0,
    middleware: ['not middleware']
  })
}

/*
 * Test: configureStore() accepts devTools flag.
 */
{
  configureStore({
    reducer: () => 0,
    devTools: true
  })

  // typings:expect-error
  configureStore({
    reducer: () => 0,
    devTools: 'true'
  })
}

/*
 * Test: configureStore() accepts devTools EnhancerOptions.
 */
{
  configureStore({
    reducer: () => 0,
    devTools: { name: 'myApp' }
  })

  // typings:expect-error
  configureStore({
    reducer: () => 0,
    devTools: { appname: 'myApp' }
  })
}

/*
 * Test: configureStore() accepts preloadedState.
 */
{
  configureStore({
    reducer: () => 0,
    preloadedState: 0
  })

  // typings:expect-error
  configureStore({
    reducer: () => 0,
    preloadedState: 'non-matching state type'
  })
}

/*
 * Test: configureStore() accepts store enhancer.
 */
{
  configureStore({
    reducer: () => 0,
    enhancers: [applyMiddleware(store => next => next)]
  })

  // typings:expect-error
  configureStore({
    reducer: () => 0,
    enhancers: ['not a store enhancer']
  })
}

/**
 * Test: configureStore() state type inference works when specifying both a
 * reducer object and a partial preloaded state.
 */
{
  let counterReducer1: Reducer<number> = () => 0
  let counterReducer2: Reducer<number> = () => 0

  const store = configureStore({
    reducer: {
      counter1: counterReducer1,
      counter2: counterReducer2
    },
    preloadedState: {
      counter1: 0
    }
  })

  const counter1: number = store.getState().counter1
  const counter2: number = store.getState().counter2
}

/**
 * Test: Dispatch typings
 */
{
  type StateA = number
  const reducerA = () => 0
  function thunkA() {
    return ((() => {}) as any) as ThunkAction<Promise<'A'>, StateA, any, any>
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
      reducer: reducerA
    })

    store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: removing the Thunk Middleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: []
    })
    // typings:expect-error
    store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: adding the thunk middleware by hand
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: [thunk] as [ThunkMiddleware<StateA>]
    })
    store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: using getDefaultMiddleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: getDefaultMiddleware<StateA>()
    })

    store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }
  /**
   * Test: custom middleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: ([] as any) as [Middleware<(a: StateA) => boolean, StateA>]
    })
    const result: boolean = store.dispatch(5)
    // typings:expect-error
    const result2: string = store.dispatch(5)
  }
  /**
   * Test: multiple custom middleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: ([] as any) as [
        Middleware<(a: 'a') => 'A', StateA>,
        Middleware<(b: 'b') => 'B', StateA>,
        ThunkMiddleware<StateA>
      ]
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
    store.dispatch(function() {} as ThunkAction<void, {}, undefined, AnyAction>)
    // null was previously documented in the redux docs
    store.dispatch(function() {} as ThunkAction<void, {}, null, AnyAction>)
    // unknown is the best way to type a ThunkAction if you do not care
    // about the value of the extraArgument, as it will always work with every
    // ThunkMiddleware, no matter the actual extraArgument type
    store.dispatch(function() {} as ThunkAction<void, {}, unknown, AnyAction>)
    // typings:expect-error
    store.dispatch(function() {} as ThunkAction<void, {}, boolean, AnyAction>)
  }

  /**
   * Test: custom middleware and getDefaultMiddleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: [
        ((() => {}) as any) as Middleware<(a: 'a') => 'A', StateA>,
        ...getDefaultMiddleware<StateA>()
      ] as const
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: middlewareBuilder notation, getDefaultMiddleware (unconfigured)
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: getDefaultMiddleware =>
        [
          ((() => {}) as any) as Middleware<(a: 'a') => 'A', StateA>,
          ...getDefaultMiddleware()
        ] as const
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }

  /**
   * Test: middlewareBuilder notation, getDefaultMiddleware (thunk: false)
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: getDefaultMiddleware =>
        [
          ((() => {}) as any) as Middleware<(a: 'a') => 'A', StateA>,
          ...getDefaultMiddleware({ thunk: false })
        ] as const
    })
    const result1: 'A' = store.dispatch('a')
    // typings:expect-error
    store.dispatch(thunkA())
  }
}
