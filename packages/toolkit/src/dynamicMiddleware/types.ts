import type {
  Middleware,
  Dispatch as ReduxDispatch,
  UnknownAction,
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

export type AddMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
> = {
  (...middlewares: Middleware<any, State, Dispatch>[]): void
  withTypes<MiddlewareConfig extends MiddlewareApiConfig>(): AddMiddleware<
    GetState<MiddlewareConfig>,
    GetDispatch<MiddlewareConfig>
  >
}

export interface WithMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
> extends BaseActionCreator<
    Middleware<any, State, Dispatch>[],
    'dynamicMiddleware/add',
    { instanceId: string }
  > {
  <Middlewares extends Middleware<any, State, Dispatch>[]>(
    ...middlewares: Middlewares
  ): PayloadAction<Middlewares, 'dynamicMiddleware/add', { instanceId: string }>
  withTypes<MiddlewareConfig extends MiddlewareApiConfig>(): WithMiddleware<
    GetState<MiddlewareConfig>,
    GetDispatch<MiddlewareConfig>
  >
}

export interface DynamicDispatch {
  // return a version of dispatch that knows about middleware
  <Middlewares extends Middleware<any>[]>(
    action: PayloadAction<Middlewares, 'dynamicMiddleware/add'>
  ): ExtractDispatchExtensions<Middlewares> & this
}

export type MiddlewareEntry<
  State = unknown,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
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
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
> = Middleware<DynamicDispatch, State, Dispatch>

export type DynamicMiddlewareInstance<
  State = unknown,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
> = {
  middleware: DynamicMiddleware<State, Dispatch>
  addMiddleware: AddMiddleware<State, Dispatch>
  withMiddleware: WithMiddleware<State, Dispatch>
  instanceId: string
}
