import type {
  AsyncThunkAction,
  SafePromise,
  SerializedError,
  ThunkAction,
  UnknownAction,
} from '@reduxjs/toolkit'
import type { Dispatch } from 'redux'
import { asSafePromise } from '../../tsHelpers'
import { getEndpointDefinition, type Api, type ApiContext } from '../apiTypes'
import type {
  BaseQueryError,
  QueryReturnValue,
  QueryStartReason,
} from '../baseQueryTypes'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import {
  ENDPOINT_QUERY,
  isQueryDefinition,
  type EndpointDefinitions,
  type InfiniteQueryArgFrom,
  type InfiniteQueryDefinition,
  type MutationDefinition,
  type PageParamFrom,
  type QueryArgFrom,
  type QueryDefinition,
  type ResultTypeFrom,
} from '../endpointDefinitions'
import { filterNullishValues } from '../utils'
import { skipToken } from '../utils/skipToken'
import {
  getRequestStatusFlags,
  QueryStatus,
  type InfiniteData,
  type InfiniteQueryConfigOptions,
  type InfiniteQueryDirection,
  type QueryCacheKey,
  type ApiRootState,
  type SubscriptionOptions,
} from './apiState'
import type {
  InfiniteQueryResultSelectorResult,
  QueryResultSelectorResult,
} from './buildSelectors'
import type {
  InfiniteQueryThunk,
  InfiniteQueryThunkArg,
  MutationThunk,
  QueryThunk,
  QueryThunkArg,
  ThunkApiMetaConfig,
} from './buildThunks'
import type { ApiEndpointQuery } from './module'
import type {
  RequestOutcome,
  RunningQuery,
  StoreRuntime,
} from './buildMiddleware/runtime'
import {
  attachRequestPromise,
  findRunningRequest,
  finishRequest,
} from './buildMiddleware/runtime'

export type BuildInitiateApiEndpointQuery<
  Definition extends QueryDefinition<any, any, any, any, any>,
> = {
  initiate: StartQueryActionCreator<Definition>
  /**
   * A thunk that returns the running request for `arg` in the store it is
   * dispatched to, or `undefined` when nothing is running for that cache
   * entry. Awaiting the result waits for that request, whether a hook,
   * `initiate`, polling, or a tag invalidation started it.
   *
   * @example
   * ```ts
   * const running = dispatch(api.endpoints.getPost.getRunningQuery(id))
   * if (running) await running
   * ```
   */
  getRunningQuery: (
    arg: QueryArgFrom<Definition>,
  ) => ThunkAction<
    QueryActionCreatorResult<Definition> | undefined,
    any,
    any,
    UnknownAction
  >
}

export type BuildInitiateApiEndpointInfiniteQuery<
  Definition extends InfiniteQueryDefinition<any, any, any, any, any>,
> = {
  initiate: StartInfiniteQueryActionCreator<Definition>
  /**
   * A thunk that returns the running request for `arg` in the store it is
   * dispatched to, or `undefined` when nothing is running for that cache
   * entry.
   */
  getRunningQuery: (
    arg: InfiniteQueryArgFrom<Definition>,
  ) => ThunkAction<
    InfiniteQueryActionCreatorResult<Definition> | undefined,
    any,
    any,
    UnknownAction
  >
}

export type BuildInitiateApiEndpointMutation<
  Definition extends MutationDefinition<any, any, any, any, any>,
> = {
  initiate: StartMutationActionCreator<Definition>
}

export const forceQueryFnSymbol = Symbol('forceQueryFn')
export const isUpsertQuery = (arg: QueryThunkArg) =>
  typeof arg[forceQueryFnSymbol] === 'function'

export const startReasonSymbol = Symbol('startReason')

export type StartQueryActionCreatorOptions = {
  subscribe?: boolean
  forceRefetch?: boolean | number
  subscriptionOptions?: SubscriptionOptions
  /**
   * Keeps the cache entry for at least this many seconds after its last
   * subscriber leaves, or after this request settles when nothing
   * subscribes. The entry is kept for `max(keepUnusedDataFor, retainFor)`.
   * Values under 1 second are raised to 1 second.
   *
   * Useful for `subscribe: false` prefetches, which would otherwise be
   * removed after `keepUnusedDataFor` even if a component is about to
   * subscribe.
   */
  retainFor?: number
  [forceQueryFnSymbol]?: () => QueryReturnValue
  [startReasonSymbol]?: QueryStartReason
}

type RefetchOptions = {
  refetchCachedPages?: boolean
}

export type StartInfiniteQueryActionCreatorOptions<
  D extends InfiniteQueryDefinition<any, any, any, any, any>,
> = StartQueryActionCreatorOptions & {
  direction?: InfiniteQueryDirection
  param?: unknown
} & Partial<
    Pick<
      Partial<
        InfiniteQueryConfigOptions<
          ResultTypeFrom<D>,
          PageParamFrom<D>,
          InfiniteQueryArgFrom<D>
        >
      >,
      'initialPageParam' | 'refetchCachedPages'
    >
  >

type AnyQueryActionCreator = (
  arg: any,
  options?: StartQueryActionCreatorOptions,
) => ThunkAction<AnyActionCreatorResult, any, any, UnknownAction>

type StartQueryActionCreator<
  D extends QueryDefinition<any, any, any, any, any>,
> = (
  arg: QueryArgFrom<D>,
  options?: StartQueryActionCreatorOptions,
) => ThunkAction<QueryActionCreatorResult<D>, any, any, UnknownAction>

export type StartInfiniteQueryActionCreator<
  D extends InfiniteQueryDefinition<any, any, any, any, any>,
> = (
  arg: InfiniteQueryArgFrom<D>,
  options?: StartInfiniteQueryActionCreatorOptions<D>,
) => ThunkAction<InfiniteQueryActionCreatorResult<D>, any, any, UnknownAction>

type QueryActionCreatorFields = {
  requestId: string
  subscriptionOptions: SubscriptionOptions | undefined
  abort(): void
  unsubscribe(): void
  updateSubscriptionOptions(options: SubscriptionOptions): void
  /**
   * Whether this request still has a subscription in the store it was
   * dispatched to. `false` after `unsubscribe()`, after `resetApiState`, and
   * for requests started with `subscribe: false`.
   */
  isSubscribed(): boolean
  queryCacheKey: string
}

type AnyActionCreatorResult = SafePromise<any> &
  QueryActionCreatorFields & {
    arg: any
    unwrap(): Promise<any>
    refetch(options?: RefetchOptions): AnyActionCreatorResult
  }

export type QueryActionCreatorResult<
  D extends QueryDefinition<any, any, any, any>,
> = SafePromise<QueryResultSelectorResult<D>> &
  QueryActionCreatorFields & {
    arg: QueryArgFrom<D>
    unwrap(): Promise<ResultTypeFrom<D>>
    refetch(): QueryActionCreatorResult<D>
  }

export type InfiniteQueryActionCreatorResult<
  D extends InfiniteQueryDefinition<any, any, any, any, any>,
> = SafePromise<InfiniteQueryResultSelectorResult<D>> &
  QueryActionCreatorFields & {
    arg: InfiniteQueryArgFrom<D>
    unwrap(): Promise<InfiniteData<ResultTypeFrom<D>, PageParamFrom<D>>>
    refetch(
      options?: Pick<
        StartInfiniteQueryActionCreatorOptions<D>,
        'refetchCachedPages'
      >,
    ): InfiniteQueryActionCreatorResult<D>
  }

type StartMutationActionCreatorOptions = {
  /**
   * If this mutation should be tracked in the store.
   * If you just want to manually trigger this mutation using `dispatch` and don't care about the
   * result, state & potential errors being held in store, you can set this to false.
   * (defaults to `true`)
   */
  track?: boolean
  fixedCacheKey?: string
}

type StartMutationActionCreator<
  D extends MutationDefinition<any, any, any, any>,
> = (
  arg: QueryArgFrom<D>,
  options?: StartMutationActionCreatorOptions,
) => ThunkAction<MutationActionCreatorResult<D>, any, any, UnknownAction>

export type MutationActionCreatorResult<
  D extends MutationDefinition<any, any, any, any>,
> = SafePromise<
  | {
      data: ResultTypeFrom<D>
      error?: undefined
    }
  | {
      data?: undefined
      error:
        | Exclude<
            BaseQueryError<
              D extends MutationDefinition<any, infer BaseQuery, any, any>
                ? BaseQuery
                : never
            >,
            undefined
          >
        | SerializedError
    }
> & {
  /** @internal */
  arg: {
    /**
     * The name of the given endpoint for the mutation
     */
    endpointName: string
    /**
     * The original arguments supplied to the mutation call
     */
    originalArgs: QueryArgFrom<D>
    /**
     * Whether the mutation is being tracked in the store.
     */
    track?: boolean
    fixedCacheKey?: string
  }
  /**
   * A unique string generated for the request sequence
   */
  requestId: string

  /**
   * A method to cancel the mutation promise. Note that this is not intended to prevent the mutation
   * that was fired off from reaching the server, but only to assist in handling the response.
   *
   * Calling `abort()` prior to the promise resolving will force it to reach the error state with
   * the serialized error:
   * `{ name: 'AbortError', message: 'Aborted' }`
   *
   * @example
   * ```ts
   * const [updateUser] = useUpdateUserMutation();
   *
   * useEffect(() => {
   *   const promise = updateUser(id);
   *   promise
   *     .unwrap()
   *     .catch((err) => {
   *       if (err.name === 'AbortError') return;
   *       // else handle the unexpected error
   *     })
   *
   *   return () => {
   *     promise.abort();
   *   }
   * }, [id, updateUser])
   * ```
   */
  abort(): void
  /**
   * Unwraps a mutation call to provide the raw response/error.
   *
   * @remarks
   * If you need to access the error or success payload immediately after a mutation, you can chain .unwrap().
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using .unwrap"
   * addPost({ id: 1, name: 'Example' })
   *   .unwrap()
   *   .then((payload) => console.log('fulfilled', payload))
   *   .catch((error) => console.error('rejected', error));
   * ```
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using .unwrap with async await"
   * try {
   *   const payload = await addPost({ id: 1, name: 'Example' }).unwrap();
   *   console.log('fulfilled', payload)
   * } catch (error) {
   *   console.error('rejected', error);
   * }
   * ```
   */
  unwrap(): Promise<ResultTypeFrom<D>>
  /**
   * A method to manually unsubscribe from the mutation call, meaning it will be removed from cache after the usual caching grace period.
   The value returned by the hook will reset to `isUninitialized` afterwards.
   */
  reset(): void
}

export function buildInitiate({
  serializeQueryArgs,
  queryThunk,
  infiniteQueryThunk,
  mutationThunk,
  api,
  context,
  getRuntime,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs
  queryThunk: QueryThunk
  infiniteQueryThunk: InfiniteQueryThunk<any>
  mutationThunk: MutationThunk
  api: Api<any, EndpointDefinitions, any, any>
  context: ApiContext<EndpointDefinitions>
  getRuntime: (dispatch: Dispatch) => StoreRuntime | undefined
}) {
  const getRunningQuery = (dispatch: Dispatch, queryCacheKey: string) =>
    getRuntime(dispatch)?.queries.get(queryCacheKey)?.request?.promise
  const getRunningMutations = (dispatch: Dispatch) =>
    getRuntime(dispatch)?.runningMutations
  const checkedStores = new WeakSet<Dispatch>()

  const {
    unsubscribeQueryResult,
    removeMutationResult,
    updateSubscriptionOptions,
  } = api.internalActions
  return {
    buildInitiateQuery,
    buildInitiateInfiniteQuery,
    buildInitiateMutation,
    buildGetRunningQuery,
    getRunningQueryThunk,
    getRunningMutationThunk,
    getRunningQueriesThunk,
    getRunningMutationsThunk,
  }

  function getRunningQueryThunk(endpointName: string, queryArgs: any) {
    return (dispatch: Dispatch) => {
      const endpointDefinition = getEndpointDefinition(context, endpointName)
      const queryCacheKey = serializeQueryArgs({
        queryArgs,
        endpointDefinition,
        endpointName,
      })
      return getRunningQuery(dispatch, queryCacheKey) as
        | QueryActionCreatorResult<never>
        | InfiniteQueryActionCreatorResult<never>
        | undefined
    }
  }

  function buildGetRunningQuery(
    endpointName: string,
    endpointDefinition:
      | QueryDefinition<any, any, any, any>
      | InfiniteQueryDefinition<any, any, any, any, any>,
  ) {
    return (
      arg: unknown,
    ): ThunkAction<RunningQuery | undefined, unknown, unknown, UnknownAction> =>
      (dispatch, getState) => {
        const runtime = getRuntime(dispatch)
        if (!runtime || arg === skipToken) return undefined
        const queryCacheKey = serializeQueryArgs({
          queryArgs: arg,
          endpointDefinition,
          endpointName,
        })
        const entry = (
          getState() as ApiRootState<EndpointDefinitions, string, string>
        )[api.reducerPath]?.queries[queryCacheKey]
        return findRunningRequest(runtime, queryCacheKey, entry)?.promise
      }
  }

  function getRunningMutationThunk(
    /**
     * this is only here to allow TS to infer the result type by input value
     * we could use it to validate the result, but it's probably not necessary
     */
    _endpointName: string,
    fixedCacheKeyOrRequestId: string,
  ) {
    return (dispatch: Dispatch) => {
      return getRunningMutations(dispatch)?.get(fixedCacheKeyOrRequestId) as
        | MutationActionCreatorResult<never>
        | undefined
    }
  }

  function getRunningQueriesThunk() {
    return (dispatch: Dispatch) => {
      const running: RunningQuery[] = []
      for (const record of getRuntime(dispatch)?.queries.values() ?? []) {
        if (record.request?.promise) running.push(record.request.promise)
      }
      return running
    }
  }

  function getRunningMutationsThunk() {
    return (dispatch: Dispatch) =>
      filterNullishValues(getRunningMutations(dispatch))
  }

  function middlewareWarning(dispatch: Dispatch) {
    if (process.env.NODE_ENV !== 'production') {
      if (checkedStores.has(dispatch)) return
      checkedStores.add(dispatch)

      if (!getRuntime(dispatch)) {
        throw new Error(
          `Warning: Middleware for RTK-Query API at reducerPath "${api.reducerPath}" has not been added to the store.
You must add the middleware for RTK-Query to function correctly!`,
        )
      }
    }
  }

  function getDefaultStartReason(
    state: ApiRootState<EndpointDefinitions, string, string>,
    queryCacheKey: QueryCacheKey,
    direction: InfiniteQueryDirection | undefined,
  ): QueryStartReason {
    const data = state[api.reducerPath]?.queries[queryCacheKey]?.data
    if (data === undefined) return 'initial'
    if (direction && (data as InfiniteData<unknown, unknown>).pages?.length) {
      return direction === 'backward' ? 'previousPage' : 'nextPage'
    }
    return 'refetch'
  }

  function buildInitiateAnyQuery<T extends 'query' | 'infiniteQuery'>(
    endpointName: string,
    endpointDefinition:
      | QueryDefinition<any, any, any, any>
      | InfiniteQueryDefinition<any, any, any, any, any>,
  ) {
    const queryAction: AnyQueryActionCreator =
      (
        arg,
        {
          subscribe = true,
          forceRefetch,
          subscriptionOptions,
          [forceQueryFnSymbol]: forceQueryFn,
          [startReasonSymbol]: explicitStartReason,
          ...rest
        }: StartQueryActionCreatorOptions = {},
      ) =>
      (dispatch, getState) => {
        // `skipToken` means "do not send a request". The arg is then a symbol
        // rather than a query argument, and `serializeQueryArgs` is a public,
        // user-supplied option that is documented to receive the query args —
        // handing it a symbol makes a custom serializer throw (or build a
        // nonsense key) before the thunk's `condition` ever gets a chance to
        // bail out. Short-circuit here so the guard cannot be bypassed.
        const queryCacheKey =
          arg === skipToken
            ? (`${endpointName}(skipToken)` as QueryCacheKey)
            : serializeQueryArgs({
                queryArgs: arg,
                endpointDefinition,
                endpointName,
              })

        let thunk: AsyncThunkAction<unknown, QueryThunkArg, ThunkApiMetaConfig>

        const commonThunkArgs = {
          ...rest,
          type: ENDPOINT_QUERY as 'query',
          subscribe,
          forceRefetch: forceRefetch,
          subscriptionOptions,
          endpointName,
          originalArgs: arg,
          queryCacheKey,
          startReason:
            explicitStartReason ??
            (forceQueryFn
              ? 'upsert'
              : getDefaultStartReason(
                  getState(),
                  queryCacheKey,
                  (rest as { direction?: InfiniteQueryDirection }).direction,
                )),
          [forceQueryFnSymbol]: forceQueryFn,
        }

        if (isQueryDefinition(endpointDefinition)) {
          thunk = queryThunk(commonThunkArgs)
        } else {
          const { direction, initialPageParam, refetchCachedPages } =
            rest as Pick<
              InfiniteQueryThunkArg<any>,
              'direction' | 'initialPageParam' | 'refetchCachedPages'
            >
          thunk = infiniteQueryThunk({
            ...(commonThunkArgs as InfiniteQueryThunkArg<any>),
            // Supply these even if undefined. This helps with a field existence
            // check over in `buildSlice.ts`
            direction,
            initialPageParam,
            refetchCachedPages,
          })
        }

        const selector = (
          api.endpoints[endpointName] as ApiEndpointQuery<any, any>
        ).select(arg)

        const thunkResult = dispatch(thunk)
        const stateAfter = selector(getState())

        middlewareWarning(dispatch)

        const { requestId, abort } = thunkResult

        const skippedSynchronously = stateAfter.requestId !== requestId

        const selectFromState = () => selector(getState())

        const runtime = getRuntime(dispatch)
        const ownRequest = runtime?.requests.get(requestId)
        // A request this call started, or the running request it joined
        const request =
          ownRequest ??
          (arg === skipToken || !runtime
            ? undefined
            : findRunningRequest(runtime, queryCacheKey, stateAfter))

        // A removed entry aborts its request with the removal reason
        const abortRequest = ownRequest
          ? () => abort(ownRequest.removed)
          : abort

        const selectOutcome = ({ state, removed }: RequestOutcome) => {
          const result = selector(state as ApiRootState<any, any, any>)
          if (!removed) return result
          return {
            ...result,
            ...getRequestStatusFlags(QueryStatus.rejected),
            error: { name: 'AbortError', message: removed },
          }
        }

        const statePromise: AnyActionCreatorResult = Object.assign(
          (forceQueryFn
            ? // a query has been forced (upsertQueryData)
              // -> we want to resolve it once data has been written with the data that will be written
              thunkResult.then(selectFromState)
            : request
              ? // resolve with the state right after this request settled,
                // or with the reason its entry was removed first
                Promise.all([request.outcome, thunkResult]).then(([outcome]) =>
                  selectOutcome(outcome),
                )
              : skippedSynchronously
                ? // a query has been skipped due to a condition and we do not have any currently running query
                  // -> we want to resolve it immediately with the current data
                  Promise.resolve(stateAfter)
                : // no middleware for this store
                  thunkResult.then(selectFromState)) as SafePromise<any>,
          {
            arg,
            requestId,
            subscriptionOptions,
            queryCacheKey,
            abort: abortRequest,
            async unwrap() {
              const result = await statePromise

              if (result.isError) {
                throw result.error
              }

              return result.data
            },
            refetch: (options?: RefetchOptions) =>
              dispatch(
                queryAction(arg, {
                  subscribe: false,
                  forceRefetch: true,
                  ...options,
                }),
              ),
            unsubscribe() {
              if (subscribe)
                dispatch(
                  unsubscribeQueryResult({
                    queryCacheKey,
                    requestId,
                  }),
                )
            },
            updateSubscriptionOptions(options: SubscriptionOptions) {
              statePromise.subscriptionOptions = options
              dispatch(
                updateSubscriptionOptions({
                  endpointName,
                  requestId,
                  queryCacheKey,
                  options,
                }),
              )
            },
            isSubscribed: () =>
              !!runtime?.queries
                .get(queryCacheKey)
                ?.subscribers?.has(requestId),
          },
        )

        if (runtime && ownRequest) {
          attachRequestPromise(
            runtime,
            requestId,
            forceQueryFn ? undefined : statePromise,
            abortRequest,
          )
          // The middleware finishes the request; this covers stores where its
          // handlers do not run, so the request cannot stay registered
          const finish = () => finishRequest(runtime, requestId, getState())
          thunkResult.then(finish, finish)
        }

        return statePromise
      }
    return queryAction
  }

  function buildInitiateQuery(
    endpointName: string,
    endpointDefinition: QueryDefinition<any, any, any, any>,
  ) {
    const queryAction: StartQueryActionCreator<any> = buildInitiateAnyQuery(
      endpointName,
      endpointDefinition,
    )

    return queryAction
  }

  function buildInitiateInfiniteQuery(
    endpointName: string,
    endpointDefinition: InfiniteQueryDefinition<any, any, any, any, any>,
  ) {
    const infiniteQueryAction: StartInfiniteQueryActionCreator<any> =
      buildInitiateAnyQuery(endpointName, endpointDefinition)

    return infiniteQueryAction
  }

  function buildInitiateMutation(
    endpointName: string,
  ): StartMutationActionCreator<any> {
    return (
      arg,
      { track = true, fixedCacheKey }: StartMutationActionCreatorOptions = {},
    ) =>
      (dispatch, getState) => {
        const thunk = mutationThunk({
          type: 'mutation',
          endpointName,
          originalArgs: arg,
          track,
          fixedCacheKey,
        })
        const thunkResult = dispatch(thunk)
        middlewareWarning(dispatch)
        const { requestId, abort, unwrap } = thunkResult
        const returnValuePromise = asSafePromise(
          thunkResult.unwrap().then((data) => ({ data })),
          (error) => ({ error }),
        )

        const reset = () => {
          dispatch(removeMutationResult({ requestId, fixedCacheKey }))
        }

        const ret = Object.assign(returnValuePromise, {
          arg: thunkResult.arg,
          requestId,
          abort,
          unwrap,
          reset,
        })

        const runningMutations = getRunningMutations(dispatch)
        if (!runningMutations) return ret

        runningMutations.set(requestId, ret)
        ret.then(() => {
          runningMutations.delete(requestId)
        })
        if (fixedCacheKey) {
          runningMutations.set(fixedCacheKey, ret)
          ret.then(() => {
            if (runningMutations.get(fixedCacheKey) === ret) {
              runningMutations.delete(fixedCacheKey)
            }
          })
        }

        return ret
      }
  }
}
