import { Middleware, Dispatch, AnyAction, MiddlewareAPI, Action } from 'redux'
import { TypedActionCreator } from './mapBuilders'
import { createAction, BaseActionCreator } from './createAction'

export type When = 'before' | 'after' | undefined
type WhenFromOptions<
  O extends ActionListenerOptions<any, any, any, any>
> = O extends ActionListenerOptions<any, any, any, infer W> ? W : never

/**
 * @alpha
 */
export interface ActionListenerMiddlewareAPI<
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions<any, any, any, any>
> extends MiddlewareAPI<D, S> {
  stopPropagation: WhenFromOptions<O> extends 'after' ? undefined : () => void
}

/**
 * @alpha
 */
export type ActionListener<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions<any, any, any, any>
> = (action: A, api: ActionListenerMiddlewareAPI<S, D, O>) => void

export interface ActionListenerOptions<
  A extends AnyAction,
  S,
  _ extends Dispatch<AnyAction>,
  W extends When = 'before'
> {
  /**
   * Indicates that the listener should be removed after if has run once.
   */
  once?: boolean
  /**
   * A function that determines if the listener should run, depending on the action and probably the state.
   */
  condition?(action: A, getState: () => S): boolean
  /**
   * Determines if the listener runs 'before' or 'after' the reducers have been called.
   * If set to 'before', calling `api.stopPropagation()` from the listener becomes possible.
   * Defaults to 'before'.
   */
  when?: W
}

export interface AddListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions<A, S, D, When>
> {
  type: 'actionListenerMiddleware/add'
  payload: {
    type: string
    listener: ActionListener<A, S, D, O>
    options?: O
  }
}

/**
 * @alpha
 */
export const addListenerAction = createAction(
  'actionListenerMiddleware/add',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any, any>,
    options?: ActionListenerOptions<AnyAction, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type,
        listener,
        options
      }
    }
  }
) as BaseActionCreator<
  {
    type: string
    listener: ActionListener<any, any, any, any>
    options: ActionListenerOptions<any, any, any>
  },
  'actionListenerMiddleware/add'
> & {
  <
    C extends TypedActionCreator<any>,
    S,
    D extends Dispatch,
    O extends ActionListenerOptions<ReturnType<C>, S, D, When>
  >(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, O>,
    options?: O
  ): AddListenerAction<ReturnType<C>, S, D, O>

  <
    S,
    D extends Dispatch,
    O extends ActionListenerOptions<AnyAction, S, D, When>
  >(
    type: string,
    listener: ActionListener<AnyAction, S, D, O>,
    options?: O
  ): AddListenerAction<AnyAction, S, D, O>
}

interface RemoveListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>
> {
  type: 'actionListenerMiddleware/remove'
  payload: {
    type: string
    listener: ActionListener<A, S, D, any>
  }
}

/**
 * @alpha
 */
export const removeListenerAction = createAction(
  'actionListenerMiddleware/remove',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type,
        listener
      }
    }
  }
) as BaseActionCreator<
  { type: string; listener: ActionListener<any, any, any, any> },
  'actionListenerMiddleware/remove'
> & {
  <C extends TypedActionCreator<any>, S, D extends Dispatch>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, any>
  ): RemoveListenerAction<ReturnType<C>, S, D>

  <S, D extends Dispatch>(
    type: string,
    listener: ActionListener<AnyAction, S, D, any>
  ): RemoveListenerAction<AnyAction, S, D>
}

/**
 * @alpha
 */
export function createActionListenerMiddleware<
  S,
  D extends Dispatch<AnyAction> = Dispatch
>() {
  type ListenerEntry = ActionListenerOptions<any, S, D, When> & {
    listener: ActionListener<any, S, D, any>
  }

  const listenerMap: Record<string, Set<ListenerEntry> | undefined> = {}
  const middleware: Middleware<
    {
      (action: Action<'actionListenerMiddleware/add'>): Unsubscribe
    },
    S,
    D
  > = api => next => action => {
    if (addListenerAction.match(action)) {
      const unsubscribe = addListener(
        action.payload.type,
        action.payload.listener,
        action.payload.options
      )

      return unsubscribe
    }
    if (removeListenerAction.match(action)) {
      removeListener(action.payload.type, action.payload.listener)

      return
    }

    const listeners = listenerMap[action.type]
    if (listeners) {
      /* before */
      for (const entry of listeners) {
        if (entry.when == 'after') {
          continue
        }

        if (!entry.condition || entry.condition(action, api.getState)) {
          if (entry.once) {
            listeners.delete(entry)
          }

          let stoppedPropagation = false
          entry.listener(action, {
            ...api,
            stopPropagation() {
              stoppedPropagation = true
            }
          })
          if (stoppedPropagation) {
            return action
          }
        }
      }

      const result = next(action)

      /* after */
      for (const entry of listeners) {
        if (entry.when != 'after') {
          continue
        }
        if (!entry.condition || entry.condition(action, api.getState)) {
          if (entry.once) {
            listeners.delete(entry)
          }

          /* after */
          entry.listener(action, {
            ...api,
            stopPropagation: () => {
              throw new Error(
                'stopPropagation can only be called by action listeners with the `when` option set to "before"'
              )
            }
          })
        }
      }

      return result
    }
    return next(action)
  }

  type Unsubscribe = () => void

  function addListener<
    C extends TypedActionCreator<any>,
    O extends ActionListenerOptions<ReturnType<C>, S, D, When>
  >(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, O>,
    options?: O
  ): Unsubscribe
  function addListener<
    T extends string,
    O extends ActionListenerOptions<Action<T>, S, D, When>
  >(
    type: T,
    listener: ActionListener<Action<T>, S, D, O>,
    options?: O
  ): Unsubscribe
  function addListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D, any>,
    options?: ActionListenerOptions<AnyAction, S, D, When>
  ): Unsubscribe {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    const listeners = getListenerMap(type)

    let entry = findListenerEntry(listeners, listener)

    if (!entry) {
      entry = {
        ...options,
        listener
      }

      listeners.add(entry)
    }

    return () => listeners.delete(entry!)
  }

  function getListenerMap(type: string) {
    if (!listenerMap[type]) {
      listenerMap[type] = new Set()
    }
    return listenerMap[type]!
  }

  function removeListener<C extends TypedActionCreator<any>>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, any>
  ): boolean
  function removeListener(
    type: string,
    listener: ActionListener<AnyAction, S, D, any>
  ): boolean
  function removeListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D, any>
  ): boolean {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    const listeners = listenerMap[type]

    if (!listeners) {
      return false
    }

    let entry = findListenerEntry(listeners, listener)

    if (!entry) {
      return false
    }

    listeners.delete(entry)
    return true
  }

  function findListenerEntry(
    entries: Set<ListenerEntry>,
    listener: Function
  ): ListenerEntry | undefined {
    for (const entry of entries) {
      if (entry.listener === listener) {
        return entry
      }
    }
  }

  return Object.assign(middleware, { addListener, removeListener })
}
