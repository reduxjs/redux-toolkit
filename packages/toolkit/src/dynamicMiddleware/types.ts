import type {
  Middleware,
  Dispatch as ReduxDispatch,
  AnyAction,
  Action,
  MiddlewareAPI,
} from 'redux'
import type { ExtractDispatchExtensions } from '../tsHelpers'
import type {
  ActionCreatorWithPreparedPayload,
  PayloadAction,
  BaseActionCreator,
} from '../createAction'

export type TypedStartMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = (...middlewares: Middleware<any, State, Dispatch>[]) => () => void

export type TypedStopMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = (...middlewares: Middleware<any, State, Dispatch>[]) => boolean[]

export interface TypedAddMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> extends BaseActionCreator<
    Middleware<any, State, Dispatch>[],
    'dynamicMiddleware/add'
  > {
  <Middlewares extends Middleware<any, State, Dispatch>[]>(
    ...middlewares: Middlewares
  ): PayloadAction<Middlewares, 'dynamicMiddleware/add'>
}

export type TypedRemoveMiddleware<
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
> = ActionCreatorWithPreparedPayload<
  Middleware<any, State, Dispatch>[],
  Middleware<any, State, Dispatch>[],
  'dynamicMiddleware/remove'
>

export interface DynamicDispatch {
  // return a version of dispatch that knows about middleware
  <Middlewares extends Middleware<any>[]>(
    action: PayloadAction<Middlewares, 'dynamicMiddleware/add'>
  ): ExtractDispatchExtensions<Middlewares> &
    this & {
      remove: () => void
    }
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
  unsubscribe: () => void
}
