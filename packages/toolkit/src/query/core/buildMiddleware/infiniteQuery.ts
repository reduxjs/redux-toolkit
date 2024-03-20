import type { InternalHandlerBuilder, QueryStateMeta, TimeoutId } from '@internal/query/core/buildMiddleware/types'

export const buildInfiniteQueryHandler: InternalHandlerBuilder = ({
 reducerPath,
 queryThunk,
 api,
fetchNextPage,
internalState,
}) => {
  const currentData: QueryStateMeta<{
    nextPollTimestamp: number
    timeout?: TimeoutId
    pollingInterval: number
  }> = {}



}