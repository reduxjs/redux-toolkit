import { Middleware, AnyAction } from 'redux'
import thunkMiddleware, { ThunkMiddleware } from 'redux-thunk'
import {
  /* PROD_START_REMOVE_UMD */
  createImmutableStateInvariantMiddleware,
  /* PROD_STOP_REMOVE_UMD */
  ImmutableStateInvariantMiddlewareOptions
} from './immutableStateInvariantMiddleware'

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

interface GetDefaultMiddlewareOptions {
  thunk?: boolean | ThunkOptions
  immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions
  serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions
}

export type ThunkMiddlewareFor<
  S,
  O extends GetDefaultMiddlewareOptions = {}
> = O extends {
  thunk: false
}
  ? never
  : O extends { thunk: { extraArgument: infer E } }
  ? ThunkMiddleware<S, AnyAction, E>
  :
      | ThunkMiddleware<S, AnyAction, null> //The ThunkMiddleware with a `null` ExtraArgument is here to provide backwards-compatibility.
      | ThunkMiddleware<S, AnyAction>

export type CurriedGetDefaultMiddleware<S = any> = <
  O extends Partial<GetDefaultMiddlewareOptions> = {
    thunk: true
    immutableCheck: true
    serializableCheck: true
  }
>(
  options?: O
) => MiddlewareArray<Middleware<{}, S> | ThunkMiddlewareFor<S, O>>

export function curryGetDefaultMiddleware<
  S = any
>(): CurriedGetDefaultMiddleware<S> {
  return function curriedGetDefaultMiddleware(options) {
    return getDefaultMiddleware(options)
  }
}

export class MiddlewareArray<
  Middlewares extends Middleware<any, any>
> extends Array<Middlewares> {
  concat<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(
    items: AdditionalMiddlewares
  ): MiddlewareArray<Middlewares | AdditionalMiddlewares[number]>

  concat<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(
    ...items: AdditionalMiddlewares
  ): MiddlewareArray<Middlewares | AdditionalMiddlewares[number]>

  concat(...arr: any[]) {
    return new MiddlewareArray(...super.concat(...arr))
  }

  prepend<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(
    items: AdditionalMiddlewares
  ): MiddlewareArray<AdditionalMiddlewares[number] | Middlewares>

  prepend<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(
    ...items: AdditionalMiddlewares
  ): MiddlewareArray<AdditionalMiddlewares[number] | Middlewares>

  prepend(...arr: any[]) {
    if (arr.length === 1 && Array.isArray(arr[0])) {
      return new MiddlewareArray(...arr[0].concat(this))
    }
    return new MiddlewareArray(...arr.concat(this))
  }
}

/**
 * Returns any array containing the default middleware installed by
 * `configureStore()`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 *
 * @return The default middleware used by `configureStore()`.
 *
 * @public
 */
export function getDefaultMiddleware<
  S = any,
  O extends Partial<GetDefaultMiddlewareOptions> = {
    thunk: true
    immutableCheck: true
    serializableCheck: true
  }
>(
  options: O = {} as O
): MiddlewareArray<Middleware<{}, S> | ThunkMiddlewareFor<S, O>> {
  const {
    thunk = true,
    immutableCheck = true,
    serializableCheck = true
  } = options

  let middlewareArray: Middleware<{}, S>[] = new MiddlewareArray()

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
    if (immutableCheck) {
      /* PROD_START_REMOVE_UMD */
      let immutableOptions: ImmutableStateInvariantMiddlewareOptions = {}

      if (!isBoolean(immutableCheck)) {
        immutableOptions = immutableCheck
      }

      middlewareArray.unshift(
        createImmutableStateInvariantMiddleware(immutableOptions)
      )
      /* PROD_STOP_REMOVE_UMD */
    }

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

  return middlewareArray as any
}
