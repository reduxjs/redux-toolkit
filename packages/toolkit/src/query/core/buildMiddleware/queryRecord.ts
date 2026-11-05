import { isUpsertQuery } from '../buildInitiate'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
} from './types'
import { normalizeRecord, removeRecord, startRequest } from './runtime'

export const buildQueryRecordHandler: InternalHandlerBuilder = ({
  api,
  queryThunk,
  runtime,
}) => {
  const { removeQueryResult } = api.internalActions

  const handler: ApiMiddlewareInternalHandler = (action) => {
    if (queryThunk.pending.match(action)) {
      const { arg, requestId } = action.meta
      if (!isUpsertQuery(arg)) {
        startRequest(runtime, arg.queryCacheKey, requestId)
      }
      normalizeRecord(runtime, arg.queryCacheKey)
    } else if (queryThunk.rejected.match(action) && action.meta.condition) {
      normalizeRecord(runtime, action.meta.arg.queryCacheKey)
    } else if (removeQueryResult.match(action)) {
      removeRecord(
        runtime,
        action.payload.queryCacheKey,
        false,
      )?.cacheEntryRemoved()
    }
  }

  return handler
}
