import type { Dispatch, Middleware, MiddlewareAPI, UnknownAction } from 'redux'
import type { BaseActionCreator, PayloadAction } from '../createAction'
import type { GetState } from '../createAsyncThunk'
import type { ExtractDispatchExtensions, FallbackIfUnknown } from '../tsHelpers'

export type GetMiddlewareApi<MiddlewareApiConfigType> = MiddlewareAPI<
  GetDispatchType<MiddlewareApiConfigType>,
  GetState<MiddlewareApiConfigType>
>

export type MiddlewareApiConfig = {
  state?: unknown
  dispatch?: Dispatch
}

// TODO: consolidate with cAT helpers?
export type GetDispatchType<MiddlewareApiConfigType> =
  MiddlewareApiConfigType extends {
    dispatch: infer InferredDispatchType
  }
    ? FallbackIfUnknown<InferredDispatchType, Dispatch>
    : Dispatch

export type AddMiddleware<
  State = any,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
> = {
  (...middlewares: Middleware<any, State, DispatchType>[]): void
  withTypes<MiddlewareConfig extends MiddlewareApiConfig>(): AddMiddleware<
    GetState<MiddlewareConfig>,
    GetDispatchType<MiddlewareConfig>
  >
}

export type WithMiddleware<
  State = any,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
> = BaseActionCreator<
  Middleware<any, State, DispatchType>[],
  'dynamicMiddleware/add',
  { instanceId: string }
> & {
  <MiddlewaresArrayType extends Middleware<any, State, DispatchType>[]>(
    ...middlewares: MiddlewaresArrayType
  ): PayloadAction<
    MiddlewaresArrayType,
    'dynamicMiddleware/add',
    { instanceId: string }
  >
  withTypes<MiddlewareConfigType extends MiddlewareApiConfig>(): WithMiddleware<
    GetState<MiddlewareConfigType>,
    GetDispatchType<MiddlewareConfigType>
  >
}

export interface DynamicDispatch {
  // return a version of dispatch that knows about middleware
  <MiddlewaresArrayType extends Middleware<any>[]>(
    action: PayloadAction<MiddlewaresArrayType, 'dynamicMiddleware/add'>,
  ): ExtractDispatchExtensions<MiddlewaresArrayType> & this
}

export type MiddlewareEntry<
  State = unknown,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
> = {
  middleware: Middleware<any, State, DispatchType>
  applied: Map<
    MiddlewareAPI<DispatchType, State>,
    ReturnType<Middleware<any, State, DispatchType>>
  >
}

export type DynamicMiddleware<
  State = unknown,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
> = Middleware<DynamicDispatch, State, DispatchType>

export type DynamicMiddlewareInstance<
  State = unknown,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
> = {
  middleware: DynamicMiddleware<State, DispatchType>
  addMiddleware: AddMiddleware<State, DispatchType>
  withMiddleware: WithMiddleware<State, DispatchType>
  instanceId: string
}
