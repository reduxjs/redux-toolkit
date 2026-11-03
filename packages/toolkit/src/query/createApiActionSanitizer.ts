import type { Action } from '@reduxjs/toolkit'

type ActionWithEndpointName = Action & {
  meta?: { arg?: { endpointName?: unknown } }
}

/**
 * Creates an `actionSanitizer` for the Redux DevTools that appends the endpoint name
 * to the type of this api's query and mutation thunk actions, so that
 * `api/executeQuery/fulfilled` is displayed as `api/executeQuery/fulfilled (getPosts)`.
 *
 * This only changes how actions are displayed in the DevTools. The dispatched actions are not modified.
 *
 * @example
 * ```ts
 * const store = configureStore({
 *   reducer: { [api.reducerPath]: api.reducer },
 *   middleware: (gDM) => gDM().concat(api.middleware),
 *   devTools: { actionSanitizer: createApiActionSanitizer(api) },
 * })
 * ```
 */
export function createApiActionSanitizer(api: { reducerPath: string }) {
  const typePrefix = `${api.reducerPath}/`
  return function apiActionSanitizer<A extends Action>(action: A): A {
    const endpointName = (action as ActionWithEndpointName).meta?.arg
      ?.endpointName
    if (
      typeof endpointName === 'string' &&
      typeof action.type === 'string' &&
      action.type.startsWith(typePrefix)
    ) {
      return { ...action, type: `${action.type} (${endpointName})` }
    }
    return action
  }
}
