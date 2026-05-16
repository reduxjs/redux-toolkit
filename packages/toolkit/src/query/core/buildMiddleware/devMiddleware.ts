import type { InternalHandlerBuilder } from './types'
import { registerMiddleware } from './registration'

export const buildDevCheckHandler: InternalHandlerBuilder = ({
  api,
  context: { apiUid },
  reducerPath,
}) => {
  return (action, mwApi) => {
    if (api.util.resetApiState.match(action)) {
      registerMiddleware(api, mwApi, apiUid, reducerPath)
    }
  }
}
