import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Middleware,
  Reducer,
  ReducersMapObject,
  StoreEnhancer
} from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'

import isPlainObject from './isPlainObject'

export function getDefaultMiddleware() {
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
) {
  const {
    reducer,
    middleware = getDefaultMiddleware(),
    devTools = true,
    preloadedState,
    enhancers = []
  } = options

  let rootReducer

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

  const storeEnhancers = [middlewareEnhancer, ...enhancers]

  let finalCompose: (...funcs: Function[]) => StoreEnhancer<S> = devTools
    ? composeWithDevTools
    : compose

  const composedEnhancer = finalCompose(...storeEnhancers)

  const store = createStore(rootReducer, preloadedState, composedEnhancer)

  return store
}
