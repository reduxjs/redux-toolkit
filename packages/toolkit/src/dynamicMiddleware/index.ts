import type {
  Middleware,
  Dispatch as ReduxDispatch,
  AnyAction,
  MiddlewareAPI,
} from 'redux'
import { compose } from 'redux'
import { createAction } from '../createAction'
import { nanoid } from '../nanoid'
import type {
  TypedAddMiddleware,
  MiddlewareEntry,
  DynamicDispatch,
} from './types'

// TODO: investigate replacing TypedAddMiddleware with .withTypes method
export const addMiddleware = createAction(
  'dynamicMiddleware/add',
  (...middlewares: Middleware<any>[]) => ({ payload: middlewares })
) as TypedAddMiddleware

export const removeMiddleware = createAction(
  'dynamicMiddleware/remove',
  (...middlewares: Middleware<any>[]) => ({ payload: middlewares })
)

export const resetMiddlewares = createAction<void, 'dynamicMiddleware/reset'>(
  'dynamicMiddleware/reset'
)

const createMiddlewareEntry = <
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
>(
  middleware: Middleware<any, State, Dispatch>
) => {
  const id = nanoid()
  const entry: MiddlewareEntry<State, Dispatch> = {
    id,
    middleware,
    applied: new Map(),
    unsubscribe: () => {
      throw new Error('Unsubscribe not initialized')
    },
  }
  return entry
}

export const createDynamicMiddleware = <
  State = any,
  Dispatch extends ReduxDispatch<AnyAction> = ReduxDispatch<AnyAction>
>() => {
  const middlewareMap = new Map<string, MiddlewareEntry<State, Dispatch>>()

  const insertEntry = (entry: MiddlewareEntry<State, Dispatch>) => {
    // TODO: decide if middleware should be removeable or not
    entry.unsubscribe = () => middlewareMap.delete(entry.id)
    middlewareMap.set(entry.id, entry)
    return () => {
      entry.unsubscribe()
    }
  }

  const findMiddlewareEntry = (
    comparator: (entry: MiddlewareEntry<State, Dispatch>) => boolean
  ): MiddlewareEntry<State, Dispatch> | undefined => {
    for (const entry of Array.from(middlewareMap.values())) {
      if (comparator(entry)) {
        return entry
      }
    }

    return undefined
  }

  // TODO: better name?
  const startMiddleware = (
    ...middlewares: Middleware<any, State, Dispatch>[]
  ) => {
    const unsubs = middlewares.map((middleware) => {
      let entry = findMiddlewareEntry(
        (entry) => entry.middleware === middleware
      )
      if (!entry) {
        entry = createMiddlewareEntry(middleware)
      }
      return insertEntry(entry)
    })
    return () => unsubs.forEach((unsub) => unsub())
  }

  const stopMiddleware = (...middlewares: Middleware<any, State, Dispatch>[]) =>
    middlewares.map((middleware) => {
      let entry = findMiddlewareEntry(
        (entry) => entry.middleware === middleware
      )
      if (entry) {
        entry.unsubscribe()
      }
      return !!entry
    })

  const clearMiddleware = () => middlewareMap.clear()

  const getFinalMiddleware = (
    api: MiddlewareAPI<Dispatch, State>
  ): ReturnType<Middleware<any, State, Dispatch>> => {
    const appliedMiddleware = Array.from(middlewareMap.values()).map(
      (entry) => {
        let applied = entry.applied.get(api)
        if (!applied) {
          applied = entry.middleware(api)
          entry.applied.set(api, applied)
        }
        return applied
      }
    )
    return compose(...appliedMiddleware)
  }

  const middleware: Middleware<DynamicDispatch, State, Dispatch> =
    (api) => (next) => (action) => {
      if (addMiddleware.match(action)) {
        const dispatch = (action: any, ...args: any[]) =>
          // @ts-ignore
          api.dispatch(action, ...args)
        dispatch.remove = startMiddleware(...action.payload)
        return dispatch
      } else if (removeMiddleware.match(action)) {
        return stopMiddleware(...action.payload)
      } else if (resetMiddlewares.match(action)) {
        return clearMiddleware()
      }
      return getFinalMiddleware(api)(next)(action)
    }

  return { middleware, startMiddleware, stopMiddleware, clearMiddleware }
}
