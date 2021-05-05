import { isPending, isRejected, isFulfilled } from '@reduxjs/toolkit'
import { toOptionalPromise } from '../../utils/toOptionalPromise'
import { SubMiddlewareBuilder } from './types'

export const build: SubMiddlewareBuilder = ({
  api,
  context,
  queryThunk,
  mutationThunk,
}) => {
  type CacheLifecycle = {
    resolve(value: unknown): unknown
    reject(value: unknown): unknown
  }
  const lifecycleMap: Record<string, CacheLifecycle> = {}

  const isPendingThunk = isPending(queryThunk, mutationThunk)
  const isRejectedThunk = isRejected(queryThunk, mutationThunk)
  const isFullfilledThunk = isFulfilled(queryThunk, mutationThunk)

  return (mwApi) => (next) => (action): any => {
    const result = next(action)

    if (isPendingThunk(action)) {
      const {
        requestId,
        arg: { endpointName, originalArgs },
      } = action.meta
      const onQuery = context.endpointDefinitions[endpointName]?.onQuery
      if (onQuery) {
        const lifecycle = {} as CacheLifecycle
        const resultPromise = toOptionalPromise(
          new Promise((resolve, reject) => {
            lifecycle.resolve = resolve
            lifecycle.reject = reject
          })
        )
        lifecycleMap[requestId] = lifecycle
        const selector = (api.endpoints[endpointName] as any).select(
          originalArgs
        )

        onQuery(
          originalArgs,
          {
            ...mwApi,
            getCacheEntry: () => selector(mwApi.getState()),
          },
          { resultPromise }
        )
      }
    } else if (isFullfilledThunk(action)) {
      const { requestId } = action.meta
      lifecycleMap[requestId]?.resolve(action.payload.result)
      delete lifecycleMap[requestId]
    } else if (isRejectedThunk(action)) {
      const { requestId } = action.meta
      lifecycleMap[requestId]?.reject(action.payload ?? action.error)
      delete lifecycleMap[requestId]
    }

    return result
  }
}
