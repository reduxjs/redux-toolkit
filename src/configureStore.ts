import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Middleware,
  Reducer,
  ReducersMapObject,
  StoreEnhancer,
  DeepPartial
} from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'

import isPlainObject from './isPlainObject'

export function getDefaultMiddleware() {
  return [thunk]
}

export function configureStore<S>(options: {
  reducer: Reducer<S> | ReducersMapObject<S>
  middleware?: Middleware[]
  devTools?: boolean
  preloadedState?: DeepPartial<S>
  enhancers?: StoreEnhancer[]
}) {
  options = options || {}

  let rootReducer

  if (typeof options.reducer === 'function') {
    rootReducer = options.reducer
  } else if (isPlainObject(options.reducer)) {
    rootReducer = combineReducers(options.reducer)
  } else {
    throw new Error(
      'Reducer argument must be a function or an object of functions that can be passed to combineReducers'
    )
  }

  const middlewareEnhancer = applyMiddleware(
    ...(options.middleware || getDefaultMiddleware())
  )

  const storeEnhancers = [middlewareEnhancer, ...(options.enhancers || [])]

  let finalCompose: (...funcs: Function[]) => StoreEnhancer =
    options.devTools !== false ? composeWithDevTools : compose

  const composedEnhancer = finalCompose(...storeEnhancers)

  const store = options.preloadedState
    ? createStore(rootReducer, options.preloadedState, composedEnhancer)
    : createStore(rootReducer, composedEnhancer)

  return store
}
