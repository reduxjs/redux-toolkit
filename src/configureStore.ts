import {
  Middleware,
  Reducer,
  ReducersMapObject,
  Store,
  StoreEnhancer,
  applyMiddleware,
  combineReducers,
  compose,
  createStore
} from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'

import isPlainObject from './isPlainObject'

export function getDefaultMiddleware(): Middleware[] {
  return [thunk]
}

export function configureStore<S>(
  options: {
    reducer?: Reducer<S> | ReducersMapObject
    middleware?: Middleware[]
    devTools?: boolean
    preloadedState?: S
    enhancers?: StoreEnhancer<S>[]
  } = {}
): Store<S> {
  const {
    reducer,
    middleware = getDefaultMiddleware(),
    devTools = true,
    preloadedState,
    enhancers = []
  } = options

  let rootReducer: Reducer<S>

  if (typeof reducer === 'function') {
    rootReducer = reducer
  } else if (isPlainObject(reducer)) {
    rootReducer = combineReducers(reducer)
  } else {
    throw new Error(
      'Reducer argument must be a function or an object of functions that can be passed to combineReducers'
    )
  }

  const middlewareEnhancer: StoreEnhancer<S> = applyMiddleware(...middleware)

  const storeEnhancers: StoreEnhancer<S>[] = [middlewareEnhancer, ...enhancers]

  let finalCompose: (...funcs: Function[]) => StoreEnhancer<S> = devTools
    ? composeWithDevTools
    : compose

  const composedEnhancer: StoreEnhancer<S> = finalCompose(...storeEnhancers)

  const store: Store<S> = createStore(
    rootReducer,
    preloadedState,
    composedEnhancer
  )

  return store
}
