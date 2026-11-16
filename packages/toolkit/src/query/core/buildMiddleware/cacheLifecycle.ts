import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import type {
  BaseQueryFn,
  BaseQueryMeta,
  BaseQueryResult,
  QueryStartReason,
} from '../../baseQueryTypes'
import type {
  BaseEndpointDefinition,
  DefinitionType,
} from '../../endpointDefinitions'
import { isAnyQueryDefinition } from '../../endpointDefinitions'
import type { QueryCacheKey, ApiRootState } from '../apiState'
import type {
  MutationResultSelectorResult,
  QueryResultSelectorResult,
} from '../buildSelectors'
import { getMutationCacheKey } from '../buildSlice'
import type { PatchCollection, Recipe } from '../buildThunks'
import { isAsyncThunkAction, isFulfilled } from '../rtkImports'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
  PromiseWithKnownReason,
  SubMiddlewareApi,
} from './types'
import type { CacheLifecycle, RemovalReason } from './runtime'
import { getThunkExtra, setCacheLifecycle } from './runtime'
import { getEndpointDefinition } from '@internal/query/apiTypes'

export type ReferenceCacheLifecycle = never

export interface QueryBaseLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
> extends LifecycleApi<ReducerPath> {
  /**
   * Gets the current value of this cache entry.
   */
  getCacheEntry(): QueryResultSelectorResult<
    { type: DefinitionType.query } & BaseEndpointDefinition<
      QueryArg,
      BaseQuery,
      ResultType,
      BaseQueryResult<BaseQuery>
    >
  >
  /**
   * Updates the current cache entry value.
   * For documentation see `api.util.updateQueryData`.
   */
  updateCachedData(updateRecipe: Recipe<ResultType>): PatchCollection
  /**
   * Why the request began, for example `'initial'`, `'invalidation'` or
   * `'poll'`. In `onCacheEntryAdded` this is the reason of the request that
   * created the cache entry, or `'upsert'` when `upsertQueryEntries` created it.
   */
  startReason: QueryStartReason
}

export type MutationBaseLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
> = LifecycleApi<ReducerPath> & {
  /**
   * Gets the current value of this cache entry.
   */
  getCacheEntry(): MutationResultSelectorResult<
    { type: DefinitionType.mutation } & BaseEndpointDefinition<
      QueryArg,
      BaseQuery,
      ResultType,
      BaseQueryResult<BaseQuery>
    >
  >
}

type LifecycleApi<ReducerPath extends string = string> = {
  /**
   * The dispatch method for the store
   */
  dispatch: ThunkDispatch<any, any, UnknownAction>
  /**
   * A method to get the current state
   */
  getState(): ApiRootState<any, any, ReducerPath>
  /**
   * `extra` as provided as `thunk.extraArgument` to the `configureStore` `getDefaultMiddleware` option.
   */
  extra: unknown
  /**
   * A unique ID generated for the mutation
   */
  requestId: string
}

type CacheLifecyclePromises<ResultType = unknown, MetaType = unknown> = {
  /**
   * Promise that will resolve with the first value for this cache key.
   * This allows you to `await` until an actual value is in cache.
   *
   * If the cache entry is removed from the cache before any value has ever
   * been resolved, this Promise will reject with
   * `new Error('Promise never resolved before cacheEntryRemoved.')`
   * to prevent memory leaks.
   * You can just re-throw that error (or not handle it at all) -
   * it will be caught outside of `cacheEntryAdded`.
   *
   * If you don't interact with this promise, it will not throw.
   */
  cacheDataLoaded: PromiseWithKnownReason<
    {
      /**
       * The (transformed) query result.
       */
      data: ResultType
      /**
       * The `meta` returned by the `baseQuery`
       */
      meta: MetaType
    },
    typeof neverResolvedError
  >
  /**
   * Promise that allows you to wait for the point in time when the cache entry
   * has been removed from the cache, by not being used/subscribed to any more
   * in the application for too long or by dispatching `api.util.resetApiState`.
   */
  cacheEntryRemoved: Promise<void>
  /**
   * Why the cache entry was removed, once `cacheEntryRemoved` has resolved:
   * `'reset'` for `api.util.resetApiState`, `'removed'` for every other removal.
   * Returns `undefined` while the entry is still in the cache.
   */
  getCacheEntryRemovedReason(): 'removed' | 'reset' | undefined
}

export interface QueryCacheLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
>
  extends
    QueryBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
    CacheLifecyclePromises<ResultType, BaseQueryMeta<BaseQuery>> {}

export type MutationCacheLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
> = MutationBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath> &
  CacheLifecyclePromises<ResultType, BaseQueryMeta<BaseQuery>>

export type CacheLifecycleQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
> = {
  onCacheEntryAdded?(
    arg: QueryArg,
    api: QueryCacheLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
  ): Promise<void> | void
}

export type CacheLifecycleInfiniteQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
> = CacheLifecycleQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery,
  ReducerPath
>

export type CacheLifecycleMutationExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
> = {
  onCacheEntryAdded?(
    arg: QueryArg,
    api: MutationCacheLifecycleApi<
      QueryArg,
      BaseQuery,
      ResultType,
      ReducerPath
    >,
  ): Promise<void> | void
}

const neverResolvedError = new Error(
  'Promise never resolved before cacheEntryRemoved.',
) as Error & {
  message: 'Promise never resolved before cacheEntryRemoved.'
}

export function warnIfNoCachedData(
  entry: object,
  endpointName: string,
  callbackName: string,
) {
  if (!('data' in entry)) {
    console.warn(
      `\`updateCachedData\` was called in \`${callbackName}\` for the endpoint "${endpointName}" before the cache entry had any data, so it did nothing. Await \`cacheDataLoaded\` or \`queryFulfilled\` before updating the cached data.`,
    )
  }
}

export function runLifecycleCallback(
  callback: () => unknown,
  endpointName: string,
  callbackName: string,
): unknown {
  try {
    return callback()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `An error was thrown synchronously in \`${callbackName}\` for the endpoint "${endpointName}". The error was caught and the request continues.`,
        error,
      )
    } else {
      console.error(error)
    }
    return undefined
  }
}

export const buildCacheLifecycleHandler: InternalHandlerBuilder = ({
  api,
  reducerPath,
  context,
  queryThunk,
  mutationThunk,
  runtime,
  selectors: { selectQueryEntry, selectApiState },
}) => {
  const isQueryThunk = isAsyncThunkAction(queryThunk)
  const isMutationThunk = isAsyncThunkAction(mutationThunk)
  const isFulfilledThunk = isFulfilled(queryThunk, mutationThunk)

  const getLifecycle = (cacheKey: string, isMutation: boolean) =>
    isMutation
      ? runtime.mutationCacheLifecycles.get(cacheKey)
      : runtime.queries.get(cacheKey)?.cacheLifecycle

  function setLifecycle(
    cacheKey: string,
    isMutation: boolean,
    lifecycle: CacheLifecycle,
  ) {
    if (isMutation) runtime.mutationCacheLifecycles.set(cacheKey, lifecycle)
    else setCacheLifecycle(runtime, cacheKey, lifecycle)
  }

  const { removeMutationResult, cacheEntriesUpserted } = api.internalActions

  function resolveLifecycleEntry(
    cacheKey: string,
    data: unknown,
    meta: unknown,
    isMutation: boolean,
    requestId?: string,
  ) {
    const lifecycle = getLifecycle(cacheKey, isMutation)

    if (
      lifecycle?.valueResolved &&
      (requestId === undefined || lifecycle.requestIds?.has(requestId))
    ) {
      lifecycle.valueResolved({
        data,
        meta,
      })
      delete lifecycle.valueResolved
      delete lifecycle.requestIds
    }
  }

  // Query lifecycles end through `removeRecord` in the query record handler
  function removeMutationLifecycle(cacheKey: string) {
    const lifecycle = runtime.mutationCacheLifecycles.get(cacheKey)
    if (lifecycle) {
      runtime.mutationCacheLifecycles.delete(cacheKey)
      lifecycle.cacheEntryRemoved('removed')
    }
  }

  function getActionMetaFields(
    action:
      | ReturnType<typeof queryThunk.pending>
      | ReturnType<typeof mutationThunk.pending>,
  ) {
    const { arg, requestId } = action.meta
    const { endpointName, originalArgs } = arg
    return [endpointName, originalArgs, requestId] as const
  }

  const handler: ApiMiddlewareInternalHandler = (
    action,
    mwApi,
    stateBefore,
  ) => {
    const cacheKey = getCacheKey(action) as QueryCacheKey

    function checkForNewCacheKey(
      endpointName: string,
      cacheKey: QueryCacheKey,
      requestId: string,
      originalArgs: unknown,
      startReason: QueryStartReason,
    ) {
      const oldEntry = selectQueryEntry(stateBefore, cacheKey)
      const newEntry = selectQueryEntry(mwApi.getState(), cacheKey)
      if (!oldEntry && newEntry) {
        handleNewKey(
          endpointName,
          originalArgs,
          cacheKey,
          mwApi,
          requestId,
          startReason,
        )
      }
    }

    if (queryThunk.pending.match(action)) {
      const [endpointName, originalArgs, requestId] =
        getActionMetaFields(action)
      checkForNewCacheKey(
        endpointName,
        cacheKey,
        requestId,
        originalArgs,
        action.meta.arg.startReason,
      )
      getLifecycle(cacheKey, false)?.requestIds?.add(requestId)
    } else if (cacheEntriesUpserted.match(action)) {
      for (const { queryDescription, value } of action.payload) {
        const { endpointName, originalArgs, queryCacheKey } = queryDescription
        checkForNewCacheKey(
          endpointName,
          queryCacheKey,
          action.meta.requestId,
          originalArgs,
          'upsert',
        )

        resolveLifecycleEntry(queryCacheKey, value, {}, false)
      }
    } else if (mutationThunk.pending.match(action)) {
      const state = mwApi.getState()[reducerPath].mutations[cacheKey]
      if (state) {
        const [endpointName, originalArgs, requestId] =
          getActionMetaFields(action)
        // A mutation re-triggered with the same `fixedCacheKey` replaces the
        // cache entry, so the previous trigger's lifecycle ends here.
        // Without a `fixedCacheKey` the cache key is the new requestId and
        // there is nothing to remove.
        removeMutationLifecycle(cacheKey)
        handleNewKey(endpointName, originalArgs, cacheKey, mwApi, requestId)
      }
    } else if (isFulfilledThunk(action)) {
      resolveLifecycleEntry(
        cacheKey,
        action.payload,
        action.meta.baseQueryMeta,
        isMutationThunk(action),
        action.meta.requestId,
      )
    } else if (removeMutationResult.match(action)) {
      removeMutationLifecycle(cacheKey)
    }
  }

  function getCacheKey(action: any) {
    if (isQueryThunk(action)) return action.meta.arg.queryCacheKey
    if (isMutationThunk(action)) {
      return action.meta.arg.fixedCacheKey ?? action.meta.requestId
    }
    if (removeMutationResult.match(action))
      return getMutationCacheKey(action.payload)
    return ''
  }

  function handleNewKey(
    endpointName: string,
    originalArgs: any,
    queryCacheKey: string,
    mwApi: SubMiddlewareApi,
    requestId: string,
    startReason?: QueryStartReason,
  ) {
    const endpointDefinition = getEndpointDefinition(context, endpointName)
    const onCacheEntryAdded = endpointDefinition?.onCacheEntryAdded
    if (!onCacheEntryAdded) return

    const lifecycle = { requestIds: new Set([requestId]) } as CacheLifecycle

    let removalReason: RemovalReason | undefined
    const cacheEntryRemoved = new Promise<void>((resolve) => {
      lifecycle.cacheEntryRemoved = (reason) => {
        removalReason = reason
        resolve()
      }
    })
    const cacheDataLoaded: PromiseWithKnownReason<
      { data: unknown; meta: unknown },
      typeof neverResolvedError
    > = Promise.race([
      new Promise<{ data: unknown; meta: unknown }>((resolve) => {
        lifecycle.valueResolved = resolve
      }),
      cacheEntryRemoved.then(() => {
        throw neverResolvedError
      }),
    ])
    // prevent uncaught promise rejections from happening.
    // if the original promise is used in any way, that will create a new promise that will throw again
    cacheDataLoaded.catch(() => {})
    setLifecycle(
      queryCacheKey,
      !isAnyQueryDefinition(endpointDefinition),
      lifecycle,
    )
    const selector = (api.endpoints[endpointName] as any).select(
      isAnyQueryDefinition(endpointDefinition) ? originalArgs : queryCacheKey,
    )

    const extra = getThunkExtra(runtime, mwApi.dispatch)
    const lifecycleApi = {
      ...mwApi,
      getCacheEntry: () => selector(mwApi.getState()),
      requestId,
      startReason,
      extra,
      updateCachedData: (isAnyQueryDefinition(endpointDefinition)
        ? (updateRecipe: Recipe<any>) => {
            if (process.env.NODE_ENV !== 'production') {
              warnIfNoCachedData(
                selector(mwApi.getState()),
                endpointName,
                'onCacheEntryAdded',
              )
            }
            return mwApi.dispatch(
              api.util.updateQueryData(
                endpointName as never,
                originalArgs as never,
                updateRecipe,
              ),
            )
          }
        : undefined) as any,

      cacheDataLoaded,
      cacheEntryRemoved,
      getCacheEntryRemovedReason: () => removalReason,
    }

    const runningHandler = runLifecycleCallback(
      () => onCacheEntryAdded(originalArgs, lifecycleApi as any),
      endpointName,
      'onCacheEntryAdded',
    )
    // if a `neverResolvedError` was thrown, but not handled in the running handler, do not let it leak out further
    Promise.resolve(runningHandler).catch((e) => {
      if (e === neverResolvedError) return
      throw e
    })
  }

  return handler
}
