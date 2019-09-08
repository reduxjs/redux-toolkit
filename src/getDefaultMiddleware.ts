import { Action, AnyAction, Middleware } from 'redux'
import thunk, { ThunkMiddleware } from 'redux-thunk'
// UMD-DEV-ONLY: import createImmutableStateInvariantMiddleware from 'redux-immutable-state-invariant'

import { createSerializableStateInvariantMiddleware } from './serializableStateInvariantMiddleware'

/**
 * Returns any array containing the default middleware installed by
 * `configureStore()`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 *
 * @return The default middleware used by `configureStore()`.
 */
export function getDefaultMiddleware<S = any, A extends Action = AnyAction>(): [
  ThunkMiddleware<S, A>,
  ...Middleware<{}, S>[]
] {
  let middlewareArray: [ThunkMiddleware<S, A>, ...Middleware<{}, S>[]] = [thunk]

  if (process.env.NODE_ENV !== 'production') {
    /* START_REMOVE_UMD */
    const createImmutableStateInvariantMiddleware = require('redux-immutable-state-invariant')
      .default
    middlewareArray.unshift(createImmutableStateInvariantMiddleware())
    /* STOP_REMOVE_UMD */

    middlewareArray.push(createSerializableStateInvariantMiddleware())
  }

  return middlewareArray
}
