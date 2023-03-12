import type {
  Middleware,
  Dispatch as ReduxDispatch,
  AnyAction,
  Action,
  MiddlewareAPI,
} from 'redux'
import type { ExtractDispatchExtensions, FallbackIfUnknown } from '../tsHelpers'
import type { PayloadAction, BaseActionCreator } from '../createAction'

export type GetMiddlewareApi<MiddlewareApiConfig> = MiddlewareAPI<
  GetDispatch<MiddlewareApiConfig>,
  GetState<MiddlewareApiConfig>
>

export type MiddlewareApiConfig = {
  state?: unknown
  dispatch?: ReduxDispatch
}

// TODO: consolidate with cAT helpers?
export type GetState<MiddlewareApiConfig> = MiddlewareApiConfig extends {
  state: infer State
}
  ? State
  : unknown

export type GetDispatch<MiddlewareApiConfig> = MiddlewareApiConfig extends {
  dispatch: infer Dispatch
}
  ? FallbackIfUnknown<Dispatch, ReduxDispatch>
  : ReduxDispatch

export type TypedAddMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = {
  (...middlewares: Middleware<any, State, Dispatch>[]): void
  withTypes<MiddlewareConfig extends MiddlewareApiConfig>(): TypedAddMiddleware<
    GetState<MiddlewareConfig>,
    GetDispatch<MiddlewareConfig>
  >
}

export interface TypedWithMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> extends BaseActionCreator<
    Middleware<any, State, Dispatch>[],
    'dynamicMiddleware/add'
  > {
  <Middlewares extends Middleware<any, State, Dispatch>[]>(
    ...middlewares: Middlewares
  ): PayloadAction<Middlewares, 'dynamicMiddleware/add'>
  withTypes<
    MiddlewareConfig extends MiddlewareApiConfig
  >(): TypedWithMiddleware<
    GetState<MiddlewareConfig>,
    GetDispatch<MiddlewareConfig>
  >
}

export interface DynamicDispatch {
  // return a version of dispatch that knows about middleware
  <Middlewares extends Middleware<any>[]>(
    action: PayloadAction<Middlewares, 'dynamicMiddleware/add'>
  ): ExtractDispatchExtensions<Middlewares> & this
  (action: Action<'dynamicMiddleware/remove'>): boolean[]
  (action: Action<'dynamicMiddleware/reset'>): void
}

export type MiddlewareEntry<
  State = unknown,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = {
  id: string
  middleware: Middleware<any, State, Dispatch>
  applied: Map<
    MiddlewareAPI<Dispatch, State>,
    ReturnType<Middleware<any, State, Dispatch>>
  >
}

export type DynamicMiddleware<
  State = unknown,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = Middleware<DynamicDispatch, State, Dispatch>

export type DynamicMiddlewareInstance<
  State = unknown,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = {
  middleware: DynamicMiddleware<State, Dispatch>
  addMiddleware: TypedAddMiddleware<State, Dispatch>
}
