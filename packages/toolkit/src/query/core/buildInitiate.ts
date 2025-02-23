import type {
  AsyncThunkAction,
  SafePromise,
  SerializedError,
  ThunkAction,
  UnknownAction,
} from '@reduxjs/toolkit'
import type { Dispatch } from 'redux'
import { asSafePromise } from '../../tsHelpers'
import type { Api, ApiContext } from '../apiTypes'
import type { BaseQueryError, QueryReturnValue } from '../baseQueryTypes'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import {
  isQueryDefinition,
  type EndpointDefinition,
  type EndpointDefinitions,
  type InfiniteQueryArgFrom,
  type InfiniteQueryDefinition,
  type MutationDefinition,
  type PageParamFrom,
  type QueryArgFrom,
  type QueryDefinition,
  type ResultTypeFrom,
} from '../endpointDefinitions'
import { countObjectKeys, getOrInsert, isNotNullish } from '../utils'
import type {
  InfiniteData,
  InfiniteQueryConfigOptions,
  InfiniteQueryDirection,
  SubscriptionOptions,
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

export type BuildInitiateApiEndpointQuery<
  Definition extends QueryDefinition<any, any, any, any, any>,
> = {
  initiate: StartQueryActionCreator<Definition>
}

export type BuildInitiateApiEndpointInfiniteQuery<
  Definition extends InfiniteQueryDefinition<any, any, any, any, any>,
> = {
  initiate: StartInfiniteQueryActionCreator<Definition>
}

export type BuildInitiateApiEndpointMutation<
  Definition extends MutationDefinition<any, any, any, any, any>,
> = {
  initiate: StartMutationActionCreator<Definition>
}

export const forceQueryFnSymbol = Symbol('forceQueryFn')
export const isUpsertQuery = (arg: QueryThunkArg) =>
  typeof arg[forceQueryFnSymbol] === 'function'

export type StartQueryActionCreatorOptions = {
  subscribe?: boolean
  forceRefetch?: boolean | number
  subscriptionOptions?: SubscriptionOptions
  [forceQueryFnSymbol]?: () => QueryReturnValue
}

export type StartInfiniteQueryActionCreatorOptions<
  D extends InfiniteQueryDefinition<any, any, any, any, any>,
> = StartQueryActionCreatorOptions & {
  direction?: InfiniteQueryDirection
  param?: unknown
} & Partial<
    Pick<
      Partial<InfiniteQueryConfigOptions<ResultTypeFrom<D>, PageParamFrom<D>>>,
      'initialPageParam'
    >
  >

type AnyQueryActionCreator<D extends EndpointDefinition<any, any, any, any>> = (
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
  queryCacheKey: string
}

type AnyActionCreatorResult = SafePromise<any> &
  QueryActionCreatorFields & {
    arg: any
    unwrap(): Promise<any>
    refetch(): AnyActionCreatorResult
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
    refetch(): InfiniteQueryActionCreatorResult<D>
  }

type StartMutationActionCreator<
  D extends MutationDefinition<any, any, any, any>,
> = (
  arg: QueryArgFrom<D>,
  options?: {
    /**
     * If this mutation should be tracked in the store.
     * If you just want to manually trigger this mutation using `dispatch` and don't care about the
     * result, state & potential errors being held in store, you can set this to false.
     * (defaults to `true`)
     */
    track?: boolean
    fixedCacheKey?: string
  },
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
}: {
  serializeQueryArgs: InternalSerializeQueryArgs
  queryThunk: QueryThunk
  infiniteQueryThunk: InfiniteQueryThunk<any>
  mutationThunk: MutationThunk
  api: Api<any, EndpointDefinitions, any, any>
  context: ApiContext<EndpointDefinitions>
}) {
  const runningQueries: Map<
    Dispatch,
    Record<
      string,
      | QueryActionCreatorResult<any>
      | InfiniteQueryActionCreatorResult<any>
      | undefined
    >
  > = new Map()
  const runningMutations: Map<
    Dispatch,
    Record<string, MutationActionCreatorResult<any> | undefined>
  > = new Map()

  const {
    unsubscribeQueryResult,
    removeMutationResult,
    updateSubscriptionOptions,
  } = api.internalActions
  return {
    buildInitiateQuery,
    buildInitiateInfiniteQuery,
    buildInitiateMutation,
    getRunningQueryThunk,
    getRunningMutationThunk,
    getRunningQueriesThunk,
    getRunningMutationsThunk,
  }

  function getRunningQueryThunk(endpointName: string, queryArgs: any) {
    return (dispatch: Dispatch) => {
      const endpointDefinition = context.endpointDefinitions[endpointName]
      const queryCacheKey = serializeQueryArgs({
        queryArgs,
        endpointDefinition,
        endpointName,
      })
      return runningQueries.get(dispatch)?.[queryCacheKey] as
        | QueryActionCreatorResult<never>
        | InfiniteQueryActionCreatorResult<never>
        | undefined
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
      return runningMutations.get(dispatch)?.[fixedCacheKeyOrRequestId] as
        | MutationActionCreatorResult<never>
        | undefined
    }
  }

  function getRunningQueriesThunk() {
    return (dispatch: Dispatch) =>
      Object.values(runningQueries.get(dispatch) || {}).filter(isNotNullish)
  }

  function getRunningMutationsThunk() {
    return (dispatch: Dispatch) =>
      Object.values(runningMutations.get(dispatch) || {}).filter(isNotNullish)
  }

  function middlewareWarning(dispatch: Dispatch) {
    if (process.env.NODE_ENV !== 'production') {
      if ((middlewareWarning as any).triggered) return
      const returnedValue = dispatch(
        api.internalActions.internal_getRTKQSubscriptions(),
      )

      ;(middlewareWarning as any).triggered = true

      // The RTKQ middleware should return the internal state object,
      // but it should _not_ be the action object.
      if (
        typeof returnedValue !== 'object' ||
        typeof returnedValue?.type === 'string'
      ) {
        // Otherwise, must not have been added
        throw new Error(
          `Warning: Middleware for RTK-Query API at reducerPath "${api.reducerPath}" has not been added to the store.
You must add the middleware for RTK-Query to function correctly!`,
        )
      }
    }
  }

  function buildInitiateAnyQuery<T extends 'query' | 'infiniteQuery'>(
    endpointName: string,
    endpointDefinition:
      | QueryDefinition<any, any, any, any>
      | InfiniteQueryDefinition<any, any, any, any, any>,
  ) {
    const queryAction: AnyQueryActionCreator<any> =
      (
        arg,
        {
          subscribe = true,
          forceRefetch,
          subscriptionOptions,
          [forceQueryFnSymbol]: forceQueryFn,
          ...rest
        } = {},
      ) =>
      (dispatch, getState) => {
        const queryCacheKey = serializeQueryArgs({
          queryArgs: arg,
          endpointDefinition,
          endpointName,
        })

        let thunk: AsyncThunkAction<unknown, QueryThunkArg, ThunkApiMetaConfig>

        const commonThunkArgs = {
          ...rest,
          type: 'query' as const,
          subscribe,
          forceRefetch: forceRefetch,
          subscriptionOptions,
          endpointName,
          originalArgs: arg,
          queryCacheKey,
          [forceQueryFnSymbol]: forceQueryFn,
        }

        if (isQueryDefinition(endpointDefinition)) {
          thunk = queryThunk(commonThunkArgs)
        } else {
          const { direction, initialPageParam } = rest as Pick<
            InfiniteQueryThunkArg<any>,
            'direction' | 'initialPageParam'
          >
          thunk = infiniteQueryThunk({
            ...(commonThunkArgs as InfiniteQueryThunkArg<any>),
            // Supply these even if undefined. This helps with a field existence
            // check over in `buildSlice.ts`
            direction,
            initialPageParam,
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

        const runningQuery = runningQueries.get(dispatch)?.[queryCacheKey]
        const selectFromState = () => selector(getState())

        const statePromise: AnyActionCreatorResult = Object.assign(
          (forceQueryFn
            ? // a query has been forced (upsertQueryData)
              // -> we want to resolve it once data has been written with the data that will be written
              thunkResult.then(selectFromState)
            : skippedSynchronously && !runningQuery
              ? // a query has been skipped due to a condition and we do not have any currently running query
                // -> we want to resolve it immediately with the current data
                Promise.resolve(stateAfter)
              : // query just started or one is already in flight
                // -> wait for the running query, then resolve with data from after that
                Promise.all([runningQuery, thunkResult]).then(
                  selectFromState,
                )) as SafePromise<any>,
          {
            arg,
            requestId,
            subscriptionOptions,
            queryCacheKey,
            abort,
            async unwrap() {
              const result = await statePromise

              if (result.isError) {
                throw result.error
              }

              return result.data
            },
            refetch: () =>
              dispatch(
                queryAction(arg, { subscribe: false, forceRefetch: true }),
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
          },
        )

        if (!runningQuery && !skippedSynchronously && !forceQueryFn) {
          const running = getOrInsert(runningQueries, dispatch, {})
          running[queryCacheKey] = statePromise

          statePromise.then(() => {
            delete running[queryCacheKey]
            if (!countObjectKeys(running)) {
              runningQueries.delete(dispatch)
            }
          })
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
    return (arg, { track = true, fixedCacheKey } = {}) =>
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

        const running = runningMutations.get(dispatch) || {}
        runningMutations.set(dispatch, running)
        running[requestId] = ret
        ret.then(() => {
          delete running[requestId]
          if (!countObjectKeys(running)) {
            runningMutations.delete(dispatch)
          }
        })
        if (fixedCacheKey) {
          running[fixedCacheKey] = ret
          ret.then(() => {
            if (running[fixedCacheKey] === ret) {
              delete running[fixedCacheKey]
              if (!countObjectKeys(running)) {
                runningMutations.delete(dispatch)
              }
            }
          })
        }

        return ret
      }
  }
}
