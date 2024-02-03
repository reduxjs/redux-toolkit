import type {
  DynamicMiddlewareInstance,
  GetDispatch,
  GetState,
  MiddlewareApiConfig,
  TSHelpersExtractDispatchExtensions,
} from '@reduxjs/toolkit'
import { createDynamicMiddleware as cDM } from '@reduxjs/toolkit'
import type { Context } from 'react'
import type { ReactReduxContextValue } from 'react-redux'
import {
  createDispatchHook,
  ReactReduxContext,
  useDispatch as useDefaultDispatch,
} from 'react-redux'
import type {
  Action as ReduxAction,
  Dispatch as ReduxDispatch,
  Middleware,
  UnknownAction,
} from 'redux'

export type UseDispatchWithMiddlewareHook<
  Middlewares extends Array<Middleware<any, State, Dispatch>> = [],
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>,
> = () => TSHelpersExtractDispatchExtensions<Middlewares> & Dispatch

export interface CreateDispatchWithMiddlewareHook<
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>,
> {
  <
    Middlewares extends [
      Middleware<any, State, Dispatch>,
      ...Array<Middleware<any, State, Dispatch>>,
    ],
  >(
    ...middlewares: Middlewares
  ): UseDispatchWithMiddlewareHook<Middlewares, State, Dispatch>
  withTypes<
    MiddlewareConfig extends MiddlewareApiConfig,
  >(): CreateDispatchWithMiddlewareHook<
    GetState<MiddlewareConfig>,
    GetDispatch<MiddlewareConfig>
  >
}

type ActionFromDispatch<Dispatch extends ReduxDispatch<ReduxAction>> =
  Dispatch extends ReduxDispatch<infer Action> ? Action : never

interface ReactDynamicMiddlewareInstance<
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>,
> extends DynamicMiddlewareInstance<State, Dispatch> {
  createDispatchWithMiddlewareHookFactory: (
    context?: Context<
      ReactReduxContextValue<State, ActionFromDispatch<Dispatch>>
    >,
  ) => CreateDispatchWithMiddlewareHook<State, Dispatch>
  createDispatchWithMiddlewareHook: CreateDispatchWithMiddlewareHook<
    State,
    Dispatch
  >
}

export const createDynamicMiddleware = <
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>,
>(): ReactDynamicMiddlewareInstance<State, Dispatch> => {
  const instance = cDM<State, Dispatch>()
  const createDispatchWithMiddlewareHookFactory = (
    // @ts-ignore
    context: Context<
      ReactReduxContextValue<State, ActionFromDispatch<Dispatch>>
    > = ReactReduxContext,
  ) => {
    const useDispatch =
      // @ts-ignore
      context === ReactReduxContext
        ? useDefaultDispatch
        : createDispatchHook(context)
    function createDispatchWithMiddlewareHook<
      Middlewares extends Array<Middleware<any, State, Dispatch>>,
    >(...middlewares: Middlewares) {
      instance.addMiddleware(...middlewares)
      return useDispatch
    }
    createDispatchWithMiddlewareHook.withTypes = () =>
      createDispatchWithMiddlewareHook
    return createDispatchWithMiddlewareHook as CreateDispatchWithMiddlewareHook<
      State,
      Dispatch
    >
  }

  const createDispatchWithMiddlewareHook =
    createDispatchWithMiddlewareHookFactory()

  return {
    ...instance,
    createDispatchWithMiddlewareHookFactory,
    createDispatchWithMiddlewareHook,
  }
}
