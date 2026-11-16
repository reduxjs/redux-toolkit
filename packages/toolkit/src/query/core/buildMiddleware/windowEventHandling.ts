import { QueryStatus, STATUS_UNINITIALIZED } from '../apiState'
import type { QueryCacheKey } from '../apiState'
import { onFocus, onOnline } from '../setupListeners'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
  SubMiddlewareApi,
} from './types'

export const buildWindowEventHandler: InternalHandlerBuilder = ({
  reducerPath,
  context,
  api,
  refetchQuery,
  runtime,
}) => {
  const { removeQueryResult } = api.internalActions

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (onFocus.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnFocus')
    }
    if (onOnline.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnReconnect')
    }
  }

  function refetchValidQueries(
    api: SubMiddlewareApi,
    type: 'refetchOnFocus' | 'refetchOnReconnect',
  ) {
    const state = api.getState()[reducerPath]
    const queries = state.queries
    context.batch(() => {
      for (const [queryCacheKey, record] of runtime.queries) {
        const querySubState = queries[queryCacheKey]
        const subscriptionSubState = record.subscribers

        if (!subscriptionSubState || !querySubState) continue

        const values = [...subscriptionSubState.values()]
        const shouldRefetch = values.length
          ? values.some((sub) => sub[type] ?? state.config[type])
          : state.config[type]

        if (shouldRefetch) {
          if (subscriptionSubState.size === 0) {
            // Like tag invalidation, a running request is decided once it settles
            if (record.request) {
              runtime.invalidatedRequestIds.add(record.request.requestId)
              continue
            }
            api.dispatch(
              removeQueryResult({
                queryCacheKey: queryCacheKey as QueryCacheKey,
              }),
            )
          } else if (querySubState.status !== STATUS_UNINITIALIZED) {
            api.dispatch(
              refetchQuery(
                querySubState,
                type === 'refetchOnFocus' ? 'focus' : 'reconnect',
              ),
            )
          }
        }
      }
    })
  }

  return handler
}
