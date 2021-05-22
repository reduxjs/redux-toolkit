import { isPending, isRejected, isFulfilled } from '@reduxjs/toolkit'
import { BaseQueryError, BaseQueryFn } from '../../baseQueryTypes'
import {
  DefinitionType,
  QueryFulfilledRejectionReason,
} from '../../endpointDefinitions'
import { Recipe } from '../buildThunks'
import {
  SubMiddlewareBuilder,
  PromiseWithKnownReason,
  PromiseConstructorWithKnownReason,
} from './types'

export type ReferenceQueryLifecycle = never

declare module '../../endpointDefinitions' {
  export interface QueryLifecyclePromises<
    ResultType,
    BaseQuery extends BaseQueryFn
  > {
    /**
     * Promise that will resolve with the (transformed) query result.
     *
     * If the query fails, this promise will reject with the error.
     *
     * This allows you to `await` for the query to finish.
     *
     * If you don't interact with this promise, it will not throw.
     */
    queryFulfilled: PromiseWithKnownReason<
      {
        /**
         * The (transformed) query result.
         */
        data: ResultType
      },
      QueryFulfilledRejectionReason<BaseQuery>
    >
  }

  type QueryFulfilledRejectionReason<BaseQuery extends BaseQueryFn> =
    | {
        error: BaseQueryError<BaseQuery>
        /**
         * If this is `false`, that means this error was returned from the `baseQuery` or `queryFn` in a controlled manner.
         */
        isUnhandledError: false
      }
    | {
        error: unknown
        /**
         * If this is `true`, that means that this error is the result of `baseQueryFn`, `queryFn` or `transformResponse` throwing an error instead of handling it properly.
         * There can not be made any assumption about the shape of `error`.
         */
        isUnhandledError: true
      }

  interface QueryExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onQueryStarted?(
      arg: QueryArg,
      api: QueryLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>
    ): Promise<void> | void
  }

  interface MutationExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onQueryStarted?(
      arg: QueryArg,
      api: MutationLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>
    ): Promise<void> | void
  }

  export interface QueryLifecycleApi<
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ResultType,
    ReducerPath extends string = string
  > extends QueryBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
      QueryLifecyclePromises<ResultType, BaseQuery> {}

  export interface MutationLifecycleApi<
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ResultType,
    ReducerPath extends string = string
  > extends MutationBaseLifecycleApi<
        QueryArg,
        BaseQuery,
        ResultType,
        ReducerPath
      >,
      QueryLifecyclePromises<ResultType, BaseQuery> {}
}

export const build: SubMiddlewareBuilder = ({
  api,
  context,
  queryThunk,
  mutationThunk,
}) => {
  const isPendingThunk = isPending(queryThunk, mutationThunk)
  const isRejectedThunk = isRejected(queryThunk, mutationThunk)
  const isFullfilledThunk = isFulfilled(queryThunk, mutationThunk)

  return (mwApi) => {
    type CacheLifecycle = {
      resolve(value: { data: unknown }): unknown
      reject(value: { error: unknown; isUnhandledError: boolean }): unknown
    }
    const lifecycleMap: Record<string, CacheLifecycle> = {}

    return (next) => (action): any => {
      const result = next(action)

      if (isPendingThunk(action)) {
        const {
          requestId,
          arg: { endpointName, originalArgs },
        } = action.meta
        const endpointDefinition = context.endpointDefinitions[endpointName]
        const onQueryStarted = endpointDefinition?.onQueryStarted
        if (onQueryStarted) {
          const lifecycle = {} as CacheLifecycle
          const queryFulfilled = new (Promise as PromiseConstructorWithKnownReason)<
            { data: unknown },
            QueryFulfilledRejectionReason<any>
          >((resolve, reject) => {
            lifecycle.resolve = resolve
            lifecycle.reject = reject
          })
          // prevent uncaught promise rejections from happening.
          // if the original promise is used in any way, that will create a new promise that will throw again
          queryFulfilled.catch(() => {})
          lifecycleMap[requestId] = lifecycle
          const selector = (api.endpoints[endpointName] as any).select(
            endpointDefinition.type === DefinitionType.query
              ? originalArgs
              : requestId
          )

          const extra = mwApi.dispatch((_, __, extra) => extra)
          const lifecycleApi = {
            ...mwApi,
            getCacheEntry: () => selector(mwApi.getState()),
            requestId,
            extra,
            updateCachedData: (endpointDefinition.type === DefinitionType.query
              ? (updateRecipe: Recipe<any>) =>
                  mwApi.dispatch(
                    api.util.updateQueryData(
                      endpointName as never,
                      originalArgs,
                      updateRecipe
                    )
                  )
              : undefined) as any,
            queryFulfilled,
          }
          onQueryStarted(originalArgs, lifecycleApi)
        }
      } else if (isFullfilledThunk(action)) {
        const { requestId } = action.meta
        lifecycleMap[requestId]?.resolve({ data: action.payload.result })
        delete lifecycleMap[requestId]
      } else if (isRejectedThunk(action)) {
        const { requestId, rejectedWithValue } = action.meta
        lifecycleMap[requestId]?.reject({
          error: action.payload ?? action.error,
          isUnhandledError: !rejectedWithValue,
        })
        delete lifecycleMap[requestId]
      }

      return result
    }
  }
}
