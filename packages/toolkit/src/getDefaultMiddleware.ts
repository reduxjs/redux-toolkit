import type { Middleware, UnknownAction } from 'redux'
import type { ActionCreatorInvariantMiddlewareOptions } from './actionCreatorInvariantMiddleware'
import { createActionCreatorInvariantMiddleware } from './actionCreatorInvariantMiddleware'
import type { ImmutableStateInvariantMiddlewareOptions } from './immutableStateInvariantMiddleware'
import { createImmutableStateInvariantMiddleware } from './immutableStateInvariantMiddleware'
import type { ThunkMiddleware } from './reduxThunkImports'
import { thunkMiddleware, withExtraArgument } from './reduxThunkImports'
import type { SerializableStateInvariantMiddlewareOptions } from './serializableStateInvariantMiddleware'
import { createSerializableStateInvariantMiddleware } from './serializableStateInvariantMiddleware'
import type { ExcludeFromTuple } from './tsHelpers'
import { Tuple } from './utils'

function isBoolean(x: any): x is boolean {
  return typeof x === 'boolean'
}

interface ThunkOptions<E = any> {
  extraArgument: E
}

interface GetDefaultMiddlewareOptions {
  thunk?: boolean | ThunkOptions
  immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions
  serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions
  actionCreatorCheck?: boolean | ActionCreatorInvariantMiddlewareOptions
}

export type ThunkMiddlewareFor<
  S,
  O extends GetDefaultMiddlewareOptions = {},
> = O extends {
  thunk: false
}
  ? never
  : O extends {
        thunk: { extraArgument: infer InferredExtraArgumentType }
      }
    ? ThunkMiddleware<S, UnknownAction, InferredExtraArgumentType>
    : ThunkMiddleware<S, UnknownAction>

export type GetDefaultMiddleware<S = any> = <
  O extends GetDefaultMiddlewareOptions = {
    thunk: true
    immutableCheck: true
    serializableCheck: true
    actionCreatorCheck: true
  },
>(
  options?: O,
) => Tuple<ExcludeFromTuple<[ThunkMiddlewareFor<S, O>], never>>

export const buildGetDefaultMiddleware = <S = any>(): GetDefaultMiddleware<S> =>
  function getDefaultMiddleware(options) {
    const {
      thunk = true,
      immutableCheck = true,
      serializableCheck = true,
      actionCreatorCheck = true,
    } = options ?? {}

    const middlewareArray = new Tuple<Middleware[]>()

    if (thunk) {
      if (isBoolean(thunk)) {
        middlewareArray.push(thunkMiddleware)
      } else {
        middlewareArray.push(withExtraArgument(thunk.extraArgument))
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      if (immutableCheck) {
        let immutableOptions: ImmutableStateInvariantMiddlewareOptions = {}

        if (!isBoolean(immutableCheck)) {
          immutableOptions = immutableCheck
        }

        middlewareArray.unshift(
          createImmutableStateInvariantMiddleware(immutableOptions),
        )
      }

      if (serializableCheck) {
        let serializableOptions: SerializableStateInvariantMiddlewareOptions =
          {}

        if (!isBoolean(serializableCheck)) {
          serializableOptions = serializableCheck
        }

        middlewareArray.push(
          createSerializableStateInvariantMiddleware(serializableOptions),
        )
      }
      if (actionCreatorCheck) {
        let actionCreatorOptions: ActionCreatorInvariantMiddlewareOptions = {}

        if (!isBoolean(actionCreatorCheck)) {
          actionCreatorOptions = actionCreatorCheck
        }

        middlewareArray.unshift(
          createActionCreatorInvariantMiddleware(actionCreatorOptions),
        )
      }
    }

    return middlewareArray as any
  }
