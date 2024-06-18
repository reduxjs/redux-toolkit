import type {
  BaseQueryError,
  BaseQueryFn,
  BaseQueryMeta,
} from '../../baseQueryTypes'
import { DefinitionType } from '../../endpointDefinitions'
import type { Recipe } from '../buildThunks'
import { isFulfilled, isPending, isRejected } from '../rtkImports'
import type {
  MutationBaseLifecycleApi,
  QueryBaseLifecycleApi,
} from './cacheLifecycle'
import type {
  ApiMiddlewareInternalHandler,
  InternalHandlerBuilder,
  PromiseConstructorWithKnownReason,
  PromiseWithKnownReason,
} from './types'

export type ReferenceQueryLifecycle = never

export type QueryLifecyclePromises<
  ResultType,
  BaseQuery extends BaseQueryFn,
> = {
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
      /**
       * The `meta` returned by the `baseQuery`
       */
      meta: BaseQueryMeta<BaseQuery>
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
      /**
       * The `meta` returned by the `baseQuery`
       */
      meta: BaseQueryMeta<BaseQuery>
    }
  | {
      error: unknown
      meta?: undefined
      /**
       * If this is `true`, that means that this error is the result of `baseQueryFn`, `queryFn`, `transformResponse` or `transformErrorResponse` throwing an error instead of handling it properly.
       * There can not be made any assumption about the shape of `error`.
       */
      isUnhandledError: true
    }

export interface QueryLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
> extends QueryBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
    QueryLifecyclePromises<ResultType, BaseQuery> {}

export type MutationLifecycleApi<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
  ReducerPath extends string = string,
> = MutationBaseLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath> &
  QueryLifecyclePromises<ResultType, BaseQuery>

export const buildQueryLifecycleHandler: InternalHandlerBuilder = ({
  api,
  context,
  queryThunk,
  mutationThunk,
}) => {
  const isPendingThunk = isPending(queryThunk, mutationThunk)
  const isRejectedThunk = isRejected(queryThunk, mutationThunk)
  const isFullfilledThunk = isFulfilled(queryThunk, mutationThunk)

  type CacheLifecycle = {
    resolve(value: { data: unknown; meta: unknown }): unknown
    reject(value: QueryFulfilledRejectionReason<any>): unknown
  }
  const lifecycleMap: Record<string, CacheLifecycle> = {}

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (isPendingThunk(action)) {
      const {
        requestId,
        arg: { endpointName, originalArgs },
      } = action.meta
      const endpointDefinition = context.endpointDefinitions[endpointName]
      const onQueryStarted = endpointDefinition?.onQueryStarted
      if (onQueryStarted) {
        const lifecycle = {} as CacheLifecycle
        const queryFulfilled =
          new (Promise as PromiseConstructorWithKnownReason)<
            { data: unknown; meta: unknown },
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
            : requestId,
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
                    updateRecipe,
                  ),
                )
            : undefined) as any,
          queryFulfilled,
        }
        onQueryStarted(originalArgs, lifecycleApi)
      }
    } else if (isFullfilledThunk(action)) {
      const { requestId, baseQueryMeta } = action.meta
      lifecycleMap[requestId]?.resolve({
        data: action.payload,
        meta: baseQueryMeta,
      })
      delete lifecycleMap[requestId]
    } else if (isRejectedThunk(action)) {
      const { requestId, rejectedWithValue, baseQueryMeta } = action.meta
      lifecycleMap[requestId]?.reject({
        error: action.payload ?? action.error,
        isUnhandledError: !rejectedWithValue,
        meta: baseQueryMeta as any,
      })
      delete lifecycleMap[requestId]
    }
  }

  return handler
}
