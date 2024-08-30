import type { Dispatch, Middleware, UnknownAction } from 'redux'
import { compose } from 'redux'
import { createAction } from '../createAction'
import { isAllOf } from '../matchers'
import { nanoid } from '../nanoid'
import { emplace, find } from '../utils'
import type {
  AddMiddleware,
  DynamicMiddleware,
  DynamicMiddlewareInstance,
  MiddlewareEntry,
  WithMiddleware,
} from './types'
export type {
  DynamicMiddlewareInstance,
  GetDispatchType as GetDispatch,
  MiddlewareApiConfig,
} from './types'

const createMiddlewareEntry = <
  State = any,
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
>(
  middleware: Middleware<any, State, DispatchType>,
): MiddlewareEntry<State, DispatchType> => ({
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
  DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>,
>(): DynamicMiddlewareInstance<State, DispatchType> => {
  const instanceId = nanoid()
  const middlewareMap = new Map<string, MiddlewareEntry<State, DispatchType>>()

  const withMiddleware = Object.assign(
    createAction(
      'dynamicMiddleware/add',
      (...middlewares: Middleware<any, State, DispatchType>[]) => ({
        payload: middlewares,
        meta: {
          instanceId,
        },
      }),
    ),
    { withTypes: () => withMiddleware },
  ) as WithMiddleware<State, DispatchType>

  const addMiddleware = Object.assign(
    function addMiddleware(
      ...middlewares: Middleware<any, State, DispatchType>[]
    ) {
      middlewares.forEach((middleware) => {
        let entry = find(
          Array.from(middlewareMap.values()),
          (entry) => entry.middleware === middleware,
        )
        if (!entry) {
          entry = createMiddlewareEntry(middleware)
        }
        middlewareMap.set(entry.id, entry)
      })
    },
    { withTypes: () => addMiddleware },
  ) as AddMiddleware<State, DispatchType>

  const getFinalMiddleware: Middleware<{}, State, DispatchType> = (api) => {
    const appliedMiddleware = Array.from(middlewareMap.values()).map((entry) =>
      emplace(entry.applied, api, { insert: () => entry.middleware(api) }),
    )
    return compose(...appliedMiddleware)
  }

  const isWithMiddleware = isAllOf(withMiddleware, matchInstance(instanceId))

  const middleware: DynamicMiddleware<State, DispatchType> =
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
