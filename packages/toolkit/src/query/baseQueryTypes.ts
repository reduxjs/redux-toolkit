import type { ThunkDispatch } from '@reduxjs/toolkit'
import type { MaybePromise, UnwrapPromise } from './tsHelpers'

/**
 * Why a query request started.
 *
 * - `'initial'`: the cache entry had no data yet (first subscription, a new arg, `initiate()`, `prefetch`, a lazy trigger, or a retry after an error that left no data)
 * - `'refetch'`: the cache entry already had data and the request was started by `refetch()`, `forceRefetch`, `refetchOnMountOrArgChange`, `prefetch` with `force` or `ifOlderThan`, or a lazy trigger
 * - `'invalidation'`: one of the entry's tags was invalidated
 * - `'poll'`: the polling interval elapsed
 * - `'focus'`: `refetchOnFocus`
 * - `'reconnect'`: `refetchOnReconnect`
 * - `'upsert'`: `upsertQueryData`, or `upsertQueryEntries` creating the entry
 * - `'hydrate'`: reserved for entries created by hydration
 * - `'nextPage'` / `'previousPage'`: `fetchNextPage()` / `fetchPreviousPage()` on an infinite query that already has pages
 *
 * More values may be added in minor releases.
 */
export type QueryStartReason =
  | 'initial'
  | 'refetch'
  | 'invalidation'
  | 'poll'
  | 'focus'
  | 'reconnect'
  | 'upsert'
  | 'hydrate'
  | 'nextPage'
  | 'previousPage'

export interface BaseQueryApi {
  signal: AbortSignal
  abort: (reason?: string) => void
  dispatch: ThunkDispatch<any, any, any>
  getState: () => unknown
  extra: unknown
  endpoint: string
  type: 'query' | 'mutation'
  /**
   * Only available for queries: indicates if a query has been forced,
   * i.e. it would have been fetched even if there would already be a cache entry
   * (this does not mean that there is already a cache entry though!)
   *
   * This can be used to for example add a `Cache-Control: no-cache` header for
   * invalidated queries.
   */
  forced?: boolean
  /**
   * Only available for queries: the cache key that was used to store the query result
   */
  queryCacheKey?: string
  /**
   * Only available for queries: why this request started, for example
   * `'invalidation'` for a refetch caused by tag invalidation.
   */
  startReason?: QueryStartReason
}

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

export type BaseQueryFn<
  Args = any,
  Result = unknown,
  Error = unknown,
  DefinitionExtraOptions = {},
  Meta = {},
> = (
  args: Args,
  api: BaseQueryApi,
  extraOptions: DefinitionExtraOptions,
) => MaybePromise<QueryReturnValue<Result, Error, Meta>>

export type BaseQueryEnhancer<
  AdditionalArgs = unknown,
  AdditionalDefinitionExtraOptions = unknown,
  Config = void,
> = <BaseQuery extends BaseQueryFn>(
  baseQuery: BaseQuery,
  config: Config,
) => BaseQueryFn<
  BaseQueryArg<BaseQuery> & AdditionalArgs,
  BaseQueryResult<BaseQuery>,
  BaseQueryError<BaseQuery>,
  BaseQueryExtraOptions<BaseQuery> & AdditionalDefinitionExtraOptions,
  NonNullable<BaseQueryMeta<BaseQuery>>
>

/**
 * @public
 */
export type BaseQueryResult<BaseQuery extends BaseQueryFn> =
  UnwrapPromise<ReturnType<BaseQuery>> extends infer Unwrapped
    ? Unwrapped extends { data: any }
      ? Unwrapped['data']
      : never
    : never

/**
 * @public
 */
export type BaseQueryMeta<BaseQuery extends BaseQueryFn> = UnwrapPromise<
  ReturnType<BaseQuery>
>['meta']

/**
 * @public
 */
export type BaseQueryError<BaseQuery extends BaseQueryFn> = Exclude<
  UnwrapPromise<ReturnType<BaseQuery>>,
  { error?: undefined }
>['error']

/**
 * @public
 */
export type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> =
  T extends (arg: infer A, ...args: any[]) => any ? A : any

/**
 * @public
 */
export type BaseQueryExtraOptions<BaseQuery extends BaseQueryFn> =
  Parameters<BaseQuery>[2]
