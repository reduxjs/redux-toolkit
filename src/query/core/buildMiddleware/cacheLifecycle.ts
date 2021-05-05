import { isAsyncThunkAction, isFulfilled } from '@reduxjs/toolkit'
import { toOptionalPromise } from '../../utils/toOptionalPromise'
import { SubMiddlewareApi, SubMiddlewareBuilder } from './types'

export const build: SubMiddlewareBuilder = ({
  api,
  reducerPath,
  context,
  queryThunk,
  mutationThunk,
}) => {
  type CacheLifecycle = {
    valueResolved?(value: unknown): unknown
    cleanup(): void
  }
  const lifecycleMap: Record<string, CacheLifecycle> = {}

  const isQueryThunk = isAsyncThunkAction(queryThunk)
  const isMutationThunk = isAsyncThunkAction(mutationThunk)
  const isFullfilledThunk = isFulfilled(queryThunk, mutationThunk)

  return (mwApi) => (next) => (action): any => {
    const result = next(action)

    const cacheKey = getCacheKey(action)

    if (queryThunk.pending.match(action)) {
      const state = mwApi.getState()[reducerPath].queries[cacheKey]
      if (state?.requestId === action.meta.requestId) {
        handleNewKey(
          action.meta.arg.endpointName,
          action.meta.arg.originalArgs,
          cacheKey,
          mwApi
        )
      }
    } else if (mutationThunk.pending.match(action)) {
      const state = mwApi.getState()[reducerPath].mutations[cacheKey]
      if (state) {
        handleNewKey(
          action.meta.arg.endpointName,
          action.meta.arg.originalArgs,
          cacheKey,
          mwApi
        )
      }
    } else if (isFullfilledThunk(action)) {
      const lifecycle = lifecycleMap[cacheKey]
      if (lifecycle?.valueResolved) {
        lifecycle.valueResolved(action.payload.result)
        delete lifecycle.valueResolved
      }
    } else if (
      api.internalActions.removeQueryResult.match(action) ||
      api.internalActions.unsubscribeMutationResult.match(action)
    ) {
      const lifecycle = lifecycleMap[cacheKey]
      if (lifecycle) {
        delete lifecycleMap[cacheKey]
        lifecycle.cleanup()
      }
    } else if (api.util.resetApiState.match(action)) {
      for (const [cacheKey, lifecycle] of Object.entries(lifecycleMap)) {
        delete lifecycleMap[cacheKey]
        lifecycle.cleanup()
      }
    }

    return result
  }

  function getCacheKey(action: any) {
    if (isQueryThunk(action)) return action.meta.arg.queryCacheKey
    if (isMutationThunk(action)) return action.meta.requestId
    if (api.internalActions.removeQueryResult.match(action))
      return action.payload.queryCacheKey
    return ''
  }

  function handleNewKey(
    endpointName: string,
    originalArgs: any,
    queryCacheKey: string,
    mwApi: SubMiddlewareApi
  ) {
    const onCacheEntryAdded =
      context.endpointDefinitions[endpointName]?.onCacheEntryAdded
    if (!onCacheEntryAdded) return

    const neverResolvedError = new Error(
      'Promise never resolved before cleanup.'
    )
    let lifecycle = {} as CacheLifecycle

    const cleanup = new Promise<void>((resolve) => {
      lifecycle.cleanup = resolve
    })
    const firstValueResolved = toOptionalPromise(
      Promise.race([
        new Promise<void>((resolve) => {
          lifecycle.valueResolved = resolve
        }),
        cleanup.then(() => {
          throw neverResolvedError
        }),
      ])
    )
    lifecycleMap[queryCacheKey] = lifecycle
    const selector = (api.endpoints[endpointName] as any).select(originalArgs)
    const runningHandler = onCacheEntryAdded(
      originalArgs,
      {
        ...mwApi,
        getCacheEntry: () => selector(mwApi.getState()),
      },
      {
        firstValueResolved,
        cleanup,
      }
    )
    // if a `neverResolvedError` was thrown, but not handled in the running handler, do not let it leak out further
    Promise.resolve(runningHandler).catch((e) => {
      if (e === neverResolvedError) return
      throw e
    })
  }
}
