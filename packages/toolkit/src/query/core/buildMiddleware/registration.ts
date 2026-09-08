import type { SubMiddlewareApi } from './types'

type MiddlewareRegistrationAction = {
  type: string
  payload: string
}

type MiddlewareRegistrationApi = {
  internalActions: {
    middlewareRegistered(apiUid: string): MiddlewareRegistrationAction
  }
}

export function registerMiddleware(
  api: MiddlewareRegistrationApi,
  mwApi: SubMiddlewareApi & {
    next(action: MiddlewareRegistrationAction): unknown
  },
  apiUid: string,
  reducerPath: string,
) {
  // Forward the registration action through the remaining chain only.
  // Restarting from the top-level dispatch can overflow the call stack
  // when many RTK Query middlewares initialize on the same action.
  mwApi.next(api.internalActions.middlewareRegistered(apiUid))

  if (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    mwApi.getState()[reducerPath]?.config?.middlewareRegistered === 'conflict'
  ) {
    console.warn(`There is a mismatch between slice and middleware for the reducerPath "${reducerPath}".
You can only have one api per reducer path, this will lead to crashes in various situations!${
      reducerPath === 'api'
        ? `
If you have multiple apis, you *have* to specify the reducerPath option when using createApi!`
        : ''
    }`)
  }
}
