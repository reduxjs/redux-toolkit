import type {
  Action as ReduxAction,
  AnyAction,
  Dispatch as ReduxDispatch,
  Middleware,
} from 'redux'
import type { ExtractDispatchExtensions } from '../tsHelpers'
import { createDynamicMiddleware as cDM } from '.'
import type { ReactReduxContextValue } from 'react-redux'
import {
  ReactReduxContext,
  useDispatch as useDefaultDispatch,
  createDispatchHook,
} from 'react-redux'
import type { Context } from 'react'
import type {
  DynamicMiddlewareInstance,
  GetDispatch,
  GetState,
  MiddlewareApiConfig,
} from './types'

export type TypedUseMiddlewareDispatchHook<
  Dispatch extends ReduxDispatch<AnyAction>,
  State = any
> = {
  <
    Middlewares extends [
      Middleware<any, State, Dispatch>,
      ...Middleware<any, State, Dispatch>[]
    ]
  >(
    ...middlewares: Middlewares
  ): () => ExtractDispatchExtensions<Middlewares> &
    Dispatch & { remove: () => void }
  withTypes<
    MiddlewareConfig extends MiddlewareApiConfig
  >(): TypedUseMiddlewareDispatchHook<
    GetDispatch<MiddlewareConfig>,
    GetState<MiddlewareConfig>
  >
}

type ActionFromDispatch<Dispatch extends ReduxDispatch<ReduxAction>> =
  Dispatch extends ReduxDispatch<infer Action> ? Action : never

interface ReactDynamicMiddlewareInstance<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> extends DynamicMiddlewareInstance<State, Dispatch> {
  createDispatchHookWithMW: (
    context?: Context<
      ReactReduxContextValue<State, ActionFromDispatch<Dispatch>>
    >
  ) => TypedUseMiddlewareDispatchHook<Dispatch, State>
  dispatchHookWithMiddleware: TypedUseMiddlewareDispatchHook<Dispatch, State>
}

export const createDynamicMiddleware = <
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
>() => {
  const instance = cDM<State, Dispatch>()
  // TODO: naming - create with custom context vs create with middlewares?
  const createDispatchHookWithMW = (
    // @ts-ignore
    context: Context<
      ReactReduxContextValue<State, ActionFromDispatch<Dispatch>>
    > = ReactReduxContext
  ) => {
    const useDispatch =
      // @ts-ignore
      context === ReactReduxContext
        ? useDefaultDispatch
        : createDispatchHook(context)
    function dispatchHookWithMiddleware<
      Middlewares extends Middleware<any, State, Dispatch>[]
    >(...middlewares: Middlewares) {
      instance.startMiddleware(...middlewares)
      return function useDispatchWithMiddleware() {
        return useDispatch()
      }
    }
    dispatchHookWithMiddleware.withTypes = () => dispatchHookWithMiddleware
    return dispatchHookWithMiddleware as TypedUseMiddlewareDispatchHook<
      Dispatch,
      State
    >
  }

  const dispatchHookWithMiddleware = createDispatchHookWithMW()

  return {
    ...instance,
    createDispatchHookWithMW,
    dispatchHookWithMiddleware,
  } as ReactDynamicMiddlewareInstance<State, Dispatch>
}
