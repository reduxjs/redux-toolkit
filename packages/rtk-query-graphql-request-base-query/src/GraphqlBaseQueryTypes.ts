import type { GraphQLClient } from 'graphql-request'
import type { ThunkDispatch } from 'redux-thunk'

type P = Parameters<GraphQLClient['request']>
export type Document = P[0]
export type Variables = P[1]
export type RequestHeaders = P[2]

export interface GraphqlBaseQueryApi {
  dispatch: ThunkDispatch<any, any, any>
  getState: () => unknown
}

export type GraphqlRequestBaseQueryArgs = {
  options:
    | {
        url: string
        requestHeaders?: RequestHeaders
      }
    | { client: GraphQLClient }
  prepareHeaders?: (
    headers: Headers,
    api: Pick<GraphqlBaseQueryApi, 'getState'>
  ) => MaybePromise<Headers>
}

export type BaseQueryFn<
  Args = any,
  Result = unknown,
  Error = unknown,
  DefinitionExtraOptions = {},
  Meta = {}
> = (
  args: Args,
  api: GraphqlBaseQueryApi,
  extraOptions: DefinitionExtraOptions
) => MaybePromise<QueryReturnValue<Result, Error, Meta>>

export type QueryReturnValue<T = unknown, E = unknown, M = unknown> =
  | {
      error: E
      data?: undefined
      meta?: M
    }
  | {
      error?: undefined
      data: T
      meta?: M
    }
export type MaybePromise<T> = T | PromiseLike<T>
