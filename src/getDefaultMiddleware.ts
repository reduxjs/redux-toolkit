import { Middleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
// UMD-DEV-ONLY: import createImmutableStateInvariantMiddleware from 'redux-immutable-state-invariant'

import {
  createSerializableStateInvariantMiddleware,
  SerializableStateInvariantMiddlewareOptions
} from './serializableStateInvariantMiddleware'

function isBoolean(x: any): x is boolean {
  return typeof x === 'boolean'
}

interface ThunkOptions<E = any> {
  extraArgument: E
}

interface ImmutableStateInvariantMiddlewareOptions {
  isImmutable?: (value: any) => boolean
  ignore?: string[]
}

interface GetDefaultMiddlewareOptions {
  thunk?: boolean | ThunkOptions
  immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions
  serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions
}

/**
 * Returns any array containing the default middleware installed by
 * `configureStore()`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 *
 * @return The default middleware used by `configureStore()`.
 */
export function getDefaultMiddleware<S = any>(
  options: GetDefaultMiddlewareOptions = {}
): Middleware<{}, S>[] {
  const {
    thunk = true,
    immutableCheck = true,
    serializableCheck = true
  } = options

  let middlewareArray: Middleware<{}, S>[] = []

  if (thunk) {
    if (isBoolean(thunk)) {
      middlewareArray.push(thunkMiddleware)
    } else {
      middlewareArray.push(
        thunkMiddleware.withExtraArgument(thunk.extraArgument)
      )
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    /* START_REMOVE_UMD */
    if (immutableCheck) {
      const createImmutableStateInvariantMiddleware = require('redux-immutable-state-invariant')
        .default

      let immutableOptions: ImmutableStateInvariantMiddlewareOptions = {}

      if (!isBoolean(immutableCheck)) {
        immutableOptions = immutableCheck
      }

      middlewareArray.unshift(
        createImmutableStateInvariantMiddleware(immutableOptions)
      )
    }

    /* STOP_REMOVE_UMD */

    if (serializableCheck) {
      let serializableOptions: SerializableStateInvariantMiddlewareOptions = {}

      if (!isBoolean(serializableCheck)) {
        serializableOptions = serializableCheck
      }

      middlewareArray.push(
        createSerializableStateInvariantMiddleware(serializableOptions)
      )
    }
  }

  return middlewareArray
}
