import { Middleware, MiddlewareAPI, Action, AnyAction } from 'redux'

interface ActionListenerMiddlewareListener<A extends Action = AnyAction> {
  (action: A, api: MiddlewareAPI): void
}

export type CaseListeners = Record<
  string,
  ActionListenerMiddlewareListener<any>
>

export type CaseListenersCheck<Listeners extends CaseListeners> = {
  [T in keyof Listeners]: Listeners[T] extends ActionListenerMiddlewareListener<
    infer A
  >
    ? A extends { type: T }
      ? Listeners[T]
      : /* 
      Type is not matching the object key. 
      Return ActionListenerMiddlewareListener<Action<T>> to hint in the resulting error message that this is wrong.
      */ ActionListenerMiddlewareListener<
          Action<T>
        >
    : never
}

export type ValidCaseListeners<Listeners extends CaseListeners> = Listeners &
  CaseListenersCheck<Listeners>

export function createActionListenerMiddleware<Listeners extends CaseListeners>(
  cases: ValidCaseListeners<Listeners>
): Middleware {
  return api => next => action => {
    const listener = cases[action.type]
    if (listener) {
      listener(action, api)
    }
    return next(action)
  }
}
