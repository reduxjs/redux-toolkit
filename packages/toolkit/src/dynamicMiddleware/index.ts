import type {
  Middleware,
  Dispatch as ReduxDispatch,
  UnknownAction,
} from 'redux'
import { compose } from 'redux'
import { createAction } from '../createAction'
import { isAllOf } from '../matchers'
import { nanoid } from '../nanoid'
import { emplace, find } from '../utils'
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

  const withMiddleware = Object.assign(
    createAction(
      'dynamicMiddleware/add',
      (...middlewares: Middleware<any, State, Dispatch>[]) => ({
        payload: middlewares,
        meta: {
          instanceId,
        },
      })
    ),
    { withTypes: () => withMiddleware }
  ) as WithMiddleware<State, Dispatch>

  const addMiddleware = Object.assign(
    function addMiddleware(...middlewares: Middleware<any, State, Dispatch>[]) {
      middlewares.forEach((middleware) => {
        let entry = find(
          Array.from(middlewareMap.values()),
          (entry) => entry.middleware === middleware
        )
        if (!entry) {
          entry = createMiddlewareEntry(middleware)
        }
        middlewareMap.set(entry.id, entry)
      })
    },
    { withTypes: () => addMiddleware }
  ) as AddMiddleware<State, Dispatch>

  const getFinalMiddleware: Middleware<{}, State, Dispatch> = (api) => {
    const appliedMiddleware = Array.from(middlewareMap.values()).map((entry) =>
      emplace(entry.applied, api, { insert: () => entry.middleware(api) })
    )
    return compose(...appliedMiddleware)
  }

  const isWithMiddleware = isAllOf(withMiddleware, matchInstance(instanceId))

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
