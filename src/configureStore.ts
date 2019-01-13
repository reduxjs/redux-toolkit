import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Reducer,
  ReducersMapObject,
  Middleware,
  Action,
  AnyAction,
  StoreEnhancer,
  Store,
  DeepPartial
} from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import createImmutableStateInvariantMiddleware from 'redux-immutable-state-invariant'
import createSerializableStateInvariantMiddleware from './serializableStateInvariantMiddleware'

import isPlainObject from './isPlainObject'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Returns any array containing the default middleware installed by
 * `configureStore()`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 *
 * @return The default middleware used by `configureStore()`.
 */
export function getDefaultMiddleware(
  isProduction = IS_PRODUCTION
): Middleware[] {
  let middlewareArray: Middleware[] = [thunk]

  if (!isProduction) {
    middlewareArray = [
      createImmutableStateInvariantMiddleware(),
      thunk,
      createSerializableStateInvariantMiddleware()
    ]
  }

  return middlewareArray
}

/**
 * Options for `configureStore()`.
 */
export interface ConfigureStoreOptions<S = any, A extends Action = AnyAction> {
  /**
   * A single reducer function that will be used as the root reducer, or an
   * object of slice reducers that will be passed to `combineReducers()`.
   */
  reducer: Reducer<S, A> | ReducersMapObject<S, A>

  /**
   * An array of Redux middleware to install. If not supplied, defaults to
   * the set of middleware returned by `getDefaultMiddleware()`.
   */
  middleware?: Middleware[]

  /**
   * Whether to enable Redux DevTools integration. Defaults to `true`.
   */
  devTools?: boolean

  /**
   * The initial state. You may optionally specify it to hydrate the state
   * from the server in universal apps, or to restore a previously serialized
   * user session. If you use `combineReducers()` to produce the root reducer
   * function (either directly or indirectly by passing an object as `reducer`),
   * this must be an object with the same shape as the reducer map keys.
   */
  // NOTE: The needlessly complicated `S extends any ? S : S` instead of just
  // `S` ensures that the TypeScript compiler doesn't attempt to infer `S`
  // based on the value passed as `preloadedState`, which might be a partial
  // state rather than the full thing.
  preloadedState?: DeepPartial<S extends any ? S : S>

  /**
   * The store enhancers to apply. See Redux's `createStore()`. If you only
   * need to add middleware, you can use the `middleware` parameter instaead.
   */
  enhancers?: StoreEnhancer[]
}

/**
 * A friendly abstraction over the standard Redux `createStore()` function.
 *
 * @param config The store configuration.
 * @returns A configured Redux store.
 */
export function configureStore<S = any, A extends Action = AnyAction>(
  options: ConfigureStoreOptions<S, A>
): Store<S, A> {
  const {
    reducer = undefined,
    middleware = getDefaultMiddleware(),
    devTools = true,
    preloadedState = undefined,
    enhancers = []
  } = options || {}

  let rootReducer: Reducer<S, A>

  if (typeof reducer === 'function') {
    rootReducer = reducer
  } else if (isPlainObject(reducer)) {
    rootReducer = combineReducers(reducer)
  } else {
    throw new Error(
      'Reducer argument must be a function or an object of functions that can be passed to combineReducers'
    )
  }

  const middlewareEnhancer = applyMiddleware(...middleware)

  let finalCompose = compose

  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions

      // @ts-ignore redux-devtools-extension doesn't have `trace` defined in
      // its type definition file yet:
      //
      // https://github.com/zalmoxisus/redux-devtools-extension/pull/624
      trace: !IS_PRODUCTION
    })
  }

  const storeEnhancers = [middlewareEnhancer, ...enhancers]

  const composedEnhancer = finalCompose(...storeEnhancers) as StoreEnhancer

  const store: Store<S, A> = createStore(
    rootReducer,
    preloadedState as DeepPartial<S>,
    composedEnhancer
  )

  return store
}
