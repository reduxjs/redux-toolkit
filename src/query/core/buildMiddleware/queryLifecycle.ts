import { isPending, isRejected, isFulfilled } from '@reduxjs/toolkit'
import { BaseQueryFn } from '../../baseQueryTypes'
import {
  OptionalPromise,
  toOptionalPromise,
} from '../../utils/toOptionalPromise'
import {
  MutationResultSelectorResult,
  QueryResultSelectorResult,
} from '../buildSelectors'
import { SubMiddlewareBuilder } from './types'

export type ReferenceQueryLifecycle = never

declare module '../../endpointDefinitions' {
  export interface QueryLifecyclePromises<ResultType> {
    /**
     * Promise that will resolve with the (transformed) query result.
     
     * If the query fails, this promise will reject with the error.
     *
     * This allows you to `await` for the query to finish.
     */
    resultPromise: OptionalPromise<ResultType>
  }

  interface QueryExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onQuery?(
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
      promises: QueryLifecyclePromises<ResultType>
    ): Promise<void> | void
  }

  interface MutationExtraOptions<
    TagTypes extends string,
    ResultType,
    QueryArg,
    BaseQuery extends BaseQueryFn,
    ReducerPath extends string = string
  > {
    onQuery?(
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
      promises: QueryLifecyclePromises<ResultType>
    ): Promise<void> | void
  }
}

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

        const extra = mwApi.dispatch((_, __, extra) => extra)
        onQuery(
          originalArgs,
          {
            ...mwApi,
            getCacheEntry: () => selector(mwApi.getState()),
            requestId,
            extra,
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
