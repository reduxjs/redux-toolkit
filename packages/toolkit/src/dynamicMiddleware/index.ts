import type {
  Middleware,
  Dispatch as ReduxDispatch,
  UnknownAction,
  MiddlewareAPI,
} from 'redux'
import { compose } from 'redux'
import { createAction, isAction } from '../createAction'
import { nanoid } from '../nanoid'
import { find, emplace } from '../utils'
import type {
  WithMiddleware,
  AddMiddleware,
  MiddlewareEntry,
  DynamicMiddleware,
  DynamicMiddlewareInstance,
} from './types'

const createMiddlewareEntry = <
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
>(
  middleware: Middleware<any, State, Dispatch>
): MiddlewareEntry<State, Dispatch> => ({
  id: nanoid(),
  middleware,
  applied: new Map(),
})

export const createDynamicMiddleware = <
  State = any,
  Dispatch extends ReduxDispatch<UnknownAction> = ReduxDispatch<UnknownAction>
>(): DynamicMiddlewareInstance<State, Dispatch> => {
  const instanceId = nanoid()
  const middlewareMap = new Map<string, MiddlewareEntry<State, Dispatch>>()

  const insertEntry = (entry: MiddlewareEntry<State, Dispatch>) => {
    middlewareMap.set(entry.id, entry)
  }

  const withMiddleware = (() => {
    const withMiddleware = createAction(
      'dynamicMiddleware/add',
      (...middlewares: Middleware<any, State, Dispatch>[]) => ({
        payload: middlewares,
        meta: {
          instanceId,
        },
      })
    )
    // @ts-ignore
    withMiddleware.withTypes = () => withMiddleware
    return withMiddleware as WithMiddleware<State, Dispatch>
  })()

  const addMiddleware = (() => {
    function addMiddleware(...middlewares: Middleware<any, State, Dispatch>[]) {
      middlewares.forEach((middleware) => {
        let entry = find(
          Array.from(middlewareMap.values()),
          (entry) => entry.middleware === middleware
        )
        if (!entry) {
          entry = createMiddlewareEntry(middleware)
        }
        insertEntry(entry)
      })
    }
    addMiddleware.withTypes = () => addMiddleware
    return addMiddleware as AddMiddleware<State, Dispatch>
  })()

  const currentMiddleware: Middleware<{}, State, Dispatch> = (api) => {
    const appliedMiddleware = Array.from(middlewareMap.values()).map((entry) =>
      emplace(entry.applied, api, { insert: () => entry.middleware(api) })
    )
    return compose(...appliedMiddleware)
  }

  const middleware: DynamicMiddleware<State, Dispatch> =
    (api) => (next) => (action) => {
      if (
        isAction(action) &&
        withMiddleware.match(action) &&
        action.meta.instanceId === instanceId
      ) {
        addMiddleware(...action.payload)
        return api.dispatch
      }
      return currentMiddleware(api)(next)(action)
    }

  return {
    middleware,
    addMiddleware,
    withMiddleware,
  }
}
