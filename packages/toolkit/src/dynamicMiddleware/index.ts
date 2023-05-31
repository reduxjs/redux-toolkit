import type {
  Middleware,
  Dispatch as ReduxDispatch,
  UnknownAction,
} from 'redux'
import { compose } from 'redux'
import { createAction, isAction } from '../createAction'
import { isAllOf } from '../matchers'
import { nanoid } from '../nanoid'
import { find } from '../utils'
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

const matchInstance =
  (instanceId: string) =>
  (action: any): action is { meta: { instanceId: string } } =>
    action?.meta?.instanceId === instanceId

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

  const getFinalMiddleware: Middleware<{}, State, Dispatch> = (api) => {
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

  const isWithMiddleware = isAllOf(
    isAction,
    withMiddleware,
    matchInstance(instanceId)
  )

  const middleware: DynamicMiddleware<State, Dispatch> =
    (api) => (next) => (action) => {
      if (isWithMiddleware(action)) {
        addMiddleware(...action.payload)
        return api.dispatch
      }
      return getFinalMiddleware(api)(next)(action)
    }

  return {
    middleware,
    addMiddleware,
    withMiddleware,
    instanceId,
  }
}
