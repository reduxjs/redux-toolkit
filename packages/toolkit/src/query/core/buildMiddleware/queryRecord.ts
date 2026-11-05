import { isUpsertQuery } from '../buildInitiate'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
} from './types'
import { normalizeRecord, startRequest } from './runtime'

export const buildQueryRecordHandler: InternalHandlerBuilder = ({
  queryThunk,
  reducerPath,
  runtime,
}) => {
  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (queryThunk.pending.match(action)) {
      const { arg, requestId } = action.meta
      const key = arg.queryCacheKey
      // A request started while this `pending` was dispatched has already
      // registered and replaced the entry, so this one must not overwrite it
      if (
        !isUpsertQuery(arg) &&
        mwApi.getState()[reducerPath].queries[key]?.requestId === requestId
      ) {
        startRequest(runtime, key, requestId)
      }
      normalizeRecord(runtime, key)
    } else if (queryThunk.rejected.match(action) && action.meta.condition) {
      normalizeRecord(runtime, action.meta.arg.queryCacheKey)
    }
  }

  return handler
}
