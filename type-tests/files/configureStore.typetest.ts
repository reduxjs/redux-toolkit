import {
  applyMiddleware,
  Dispatch,
  AnyAction,
  Middleware,
  Reducer,
  Store
} from 'redux'
import { configureStore, PayloadAction } from '../../src'

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
 * Test: Returned store allows dispatching thunks.
 */
{
  const store = configureStore({
    reducer: () => 0
  })

  function incrementMaybe() {
    return (dispatch: Dispatch) => {
      if (Math.random() > 0.5) {
        dispatch({ type: 'increment' })
      }
    }
  }

  store.dispatch(incrementMaybe())
}
