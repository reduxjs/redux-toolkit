import { isAsyncThunkAction, isFulfilled } from '@reduxjs/toolkit'
import { AnyAction } from 'redux'
import { ThunkDispatch } from 'redux-thunk'
import { BaseQueryFn } from '../../baseQueryTypes'
import {
  OptionalPromise,
  toOptionalPromise,
} from '../../utils/toOptionalPromise'
import { RootState } from '../apiState'
import {
  MutationResultSelectorResult,
  QueryResultSelectorResult,
} from '../buildSelectors'
import { SubMiddlewareApi, SubMiddlewareBuilder } from './types'

export type ReferenceCacheLifecycle = never

declare module '../../endpointDefinitions' {
  export type LifecycleApi<
    ReducerPath extends string = string,
    CacheEntry = unknown
  > = {
    /**
     * The dispatch method for the store
     */
    dispatch: ThunkDispatch<any, any, AnyAction>
    /**
     * A method to get the current state
     */
    getState(): RootState<any, any, ReducerPath>
    /**
     * `extra` as provided as `thunk.extraArgument` to the `configureStore` `getDefaultMiddleware` option.
     */
    extra: unknown
    /**
     * A unique ID generated for the mutation
     */
    requestId: string
    /**
     * Gets the current value of this cache entry.
     */
    getCacheEntry: () => CacheEntry
  }

  export interface CacheLifecyclePromises<ResultType = unknown> {
    /**
     * Promise that will resolve with the first value for this cache key.
     * This allows you to `await` until an actual value is in cache.
     *
     * If the cache entry is removed from the cache before any value has ever
     * been resolved, this Promise will reject with
     * `new Error('Promise never resolved before cleanup.')`
     * to prevent memory leaks.
     * You can just re-throw that error (or not handle it at all) -
     * it will be caught outside of `cacheEntryAdded`.
     */
    firstValueResolved: OptionalPromise<ResultType>
    /**
     * Promise that allows you to wait for the point in time when the cache entry
     * has been removed from the cache, by not being used/subscribed to any more
     * in the application for too long or by dispatching `api.util.resetApiState`.
     */
    cleanup: Promise<void>
  }

  interface QueryExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onCacheEntryAdded?(
      arg: QueryArg,
      api: LifecycleApi<
        ReducerPath,
        QueryResultSelectorResult<
          { type: DefinitionType.query } & BaseEndpointDefinition<
            QueryArg,
            BaseQuery,
            ResultType
          >
        >
      >,
      promises: CacheLifecyclePromises<ResultType>
    ): Promise<void> | void
  }

  interface MutationExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onCacheEntryAdded?(
      arg: QueryArg,
      api: LifecycleApi<
        ReducerPath,
        MutationResultSelectorResult<
          { type: DefinitionType.mutation } & BaseEndpointDefinition<
            QueryArg,
            BaseQuery,
            ResultType
          >
        >
      >,
      promises: CacheLifecyclePromises<ResultType>
    ): Promise<void> | void
  }
}

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
          mwApi,
          action.meta.requestId
        )
      }
    } else if (mutationThunk.pending.match(action)) {
      const state = mwApi.getState()[reducerPath].mutations[cacheKey]
      if (state) {
        handleNewKey(
          action.meta.arg.endpointName,
          action.meta.arg.originalArgs,
          cacheKey,
          mwApi,
          action.meta.requestId
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
    mwApi: SubMiddlewareApi,
    requestId: string
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
    const extra = mwApi.dispatch((_, __, extra) => extra)
    const runningHandler = onCacheEntryAdded(
      originalArgs,
      {
        ...mwApi,
        getCacheEntry: () => selector(mwApi.getState()),
        requestId,
        extra,
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
