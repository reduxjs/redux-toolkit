import { isPending, isRejected, isFulfilled } from '@reduxjs/toolkit'
import { BaseQueryFn } from '../../baseQueryTypes'
import { DefinitionType } from '../../endpointDefinitions'
import {
  OptionalPromise,
  toOptionalPromise,
} from '../../utils/toOptionalPromise'
import { Recipe } from '../buildThunks'
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
      api: QueryLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
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
      api: MutationLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>,
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
  const isPendingThunk = isPending(queryThunk, mutationThunk)
  const isRejectedThunk = isRejected(queryThunk, mutationThunk)
  const isFullfilledThunk = isFulfilled(queryThunk, mutationThunk)

  return (mwApi) => {
    type CacheLifecycle = {
      resolve(value: unknown): unknown
      reject(value: unknown): unknown
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
        const onQuery = endpointDefinition?.onQuery
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
            updateCacheEntry: (endpointDefinition.type === DefinitionType.query
              ? (updateRecipe: Recipe<any>) =>
                  mwApi.dispatch(
                    api.util.updateQueryResult(
                      endpointName as never,
                      originalArgs,
                      updateRecipe
                    )
                  )
              : undefined) as any,
          }
          onQuery(originalArgs, lifecycleApi, { resultPromise })
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
}
