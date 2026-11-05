import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
} from './types'
import { finishRequest, normalizeRecord } from './runtime'

export const buildQueryRecordHandler: InternalHandlerBuilder = ({
  queryThunk,
  runtime,
}) => {
  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (queryThunk.pending.match(action)) {
      normalizeRecord(runtime, action.meta.arg.queryCacheKey)
    } else if (queryThunk.rejected.match(action) && action.meta.condition) {
      normalizeRecord(runtime, action.meta.arg.queryCacheKey)
    } else if (
      queryThunk.fulfilled.match(action) ||
      queryThunk.rejected.match(action)
    ) {
      finishRequest(runtime, action.meta.requestId, mwApi.getState())
    }
  }

  return handler
}
