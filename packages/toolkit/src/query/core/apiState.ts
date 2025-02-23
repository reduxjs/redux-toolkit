import type { SerializedError } from '@reduxjs/toolkit'
import type { BaseQueryError } from '../baseQueryTypes'
import type {
  BaseEndpointDefinition,
  EndpointDefinitions,
  InfiniteQueryDefinition,
  MutationDefinition,
  PageParamFrom,
  QueryArgFrom,
  QueryDefinition,
  ResultTypeFrom,
} from '../endpointDefinitions'
import type { Id, WithRequiredProp } from '../tsHelpers'

export type QueryCacheKey = string & { _type: 'queryCacheKey' }
export type QuerySubstateIdentifier = { queryCacheKey: QueryCacheKey }
export type MutationSubstateIdentifier =
  | {
      requestId: string
      fixedCacheKey?: string
    }
  | {
      requestId?: string
      fixedCacheKey: string
    }

export type RefetchConfigOptions = {
  refetchOnMountOrArgChange: boolean | number
  refetchOnReconnect: boolean
  refetchOnFocus: boolean
}

export type PageParamFunction<DataType, PageParam> = (
  firstPage: DataType,
  allPages: Array<DataType>,
  firstPageParam: PageParam,
  allPageParams: Array<PageParam>,
) => PageParam | undefined | null

export type InfiniteQueryConfigOptions<DataType, PageParam> = {
  /**
   * The initial page parameter to use for the first page fetch.
   */
  initialPageParam: PageParam
  /**
   * This function is required to automatically get the next cursor for infinite queries.
   * The result will also be used to determine the value of `hasNextPage`.
   */
  getNextPageParam: PageParamFunction<DataType, PageParam>
  /**
   * This function can be set to automatically get the previous cursor for infinite queries.
   * The result will also be used to determine the value of `hasPreviousPage`.
   */
  getPreviousPageParam?: PageParamFunction<DataType, PageParam>
  /**
   * If specified, only keep this many pages in cache at once.
   * If additional pages are fetched, older pages in the other
   * direction will be dropped from the cache.
   */
  maxPages?: number
}

export interface InfiniteData<DataType, PageParam> {
  pages: Array<DataType>
  pageParams: Array<PageParam>
}

/**
 * Strings describing the query state at any given time.
 */
export enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

export type RequestStatusFlags =
  | {
      status: QueryStatus.uninitialized
      isUninitialized: true
      isLoading: false
      isSuccess: false
      isError: false
    }
  | {
      status: QueryStatus.pending
      isUninitialized: false
      isLoading: true
      isSuccess: false
      isError: false
    }
  | {
      status: QueryStatus.fulfilled
      isUninitialized: false
      isLoading: false
      isSuccess: true
      isError: false
    }
  | {
      status: QueryStatus.rejected
      isUninitialized: false
      isLoading: false
      isSuccess: false
      isError: true
    }

export function getRequestStatusFlags(status: QueryStatus): RequestStatusFlags {
  return {
    status,
    isUninitialized: status === QueryStatus.uninitialized,
    isLoading: status === QueryStatus.pending,
    isSuccess: status === QueryStatus.fulfilled,
    isError: status === QueryStatus.rejected,
  } as any
}

/**
 * @public
 */
export type SubscriptionOptions = {
  /**
   * How frequently to automatically re-fetch data (in milliseconds). Defaults to `0` (off).
   */
  pollingInterval?: number
  /**
   *  Defaults to 'false'. This setting allows you to control whether RTK Query will continue polling if the window is not focused.
   *
   *  If pollingInterval is not set or set to 0, this **will not be evaluated** until pollingInterval is greater than 0.
   *
   *  Note: requires [`setupListeners`](./setupListeners) to have been called.
   */
  skipPollingIfUnfocused?: boolean
  /**
   * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.
   *
   * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
   *
   * Note: requires [`setupListeners`](./setupListeners) to have been called.
   */
  refetchOnReconnect?: boolean
  /**
   * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.
   *
   * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
   *
   * Note: requires [`setupListeners`](./setupListeners) to have been called.
   */
  refetchOnFocus?: boolean
}
export type Subscribers = { [requestId: string]: SubscriptionOptions }
export type QueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    any,
    any,
    any,
    any
  >
    ? K
    : never
}[keyof Definitions]

export type InfiniteQueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends InfiniteQueryDefinition<
    any,
    any,
    any,
    any,
    any
  >
    ? K
    : never
}[keyof Definitions]

export type MutationKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<
    any,
    any,
    any,
    any
  >
    ? K
    : never
}[keyof Definitions]

type BaseQuerySubState<
  D extends BaseEndpointDefinition<any, any, any>,
  DataType = ResultTypeFrom<D>,
> = {
  /**
   * The argument originally passed into the hook or `initiate` action call
   */
  originalArgs: QueryArgFrom<D>
  /**
   * A unique ID associated with the request
   */
  requestId: string
  /**
   * The received data from the query
   */
  data?: DataType
  /**
   * The received error if applicable
   */
  error?:
    | SerializedError
    | (D extends QueryDefinition<any, infer BaseQuery, any, any>
        ? BaseQueryError<BaseQuery>
        : never)
  /**
   * The name of the endpoint associated with the query
   */
  endpointName: string
  /**
   * Time that the latest query started
   */
  startedTimeStamp: number
  /**
   * Time that the latest query was fulfilled
   */
  fulfilledTimeStamp?: number
}

export type QuerySubState<
  D extends BaseEndpointDefinition<any, any, any>,
  DataType = ResultTypeFrom<D>,
> = Id<
  | ({
      status: QueryStatus.fulfilled
    } & WithRequiredProp<
      BaseQuerySubState<D, DataType>,
      'data' | 'fulfilledTimeStamp'
    > & { error: undefined })
  | ({
      status: QueryStatus.pending
    } & BaseQuerySubState<D, DataType>)
  | ({
      status: QueryStatus.rejected
    } & WithRequiredProp<BaseQuerySubState<D, DataType>, 'error'>)
  | {
      status: QueryStatus.uninitialized
      originalArgs?: undefined
      data?: undefined
      error?: undefined
      requestId?: undefined
      endpointName?: string
      startedTimeStamp?: undefined
      fulfilledTimeStamp?: undefined
    }
>

export type InfiniteQueryDirection = 'forward' | 'backward'

export type InfiniteQuerySubState<
  D extends BaseEndpointDefinition<any, any, any>,
> =
  D extends InfiniteQueryDefinition<any, any, any, any, any>
    ? QuerySubState<D, InfiniteData<ResultTypeFrom<D>, PageParamFrom<D>>> & {
        direction?: InfiniteQueryDirection
      }
    : never

type BaseMutationSubState<D extends BaseEndpointDefinition<any, any, any>> = {
  requestId: string
  data?: ResultTypeFrom<D>
  error?:
    | SerializedError
    | (D extends MutationDefinition<any, infer BaseQuery, any, any>
        ? BaseQueryError<BaseQuery>
        : never)
  endpointName: string
  startedTimeStamp: number
  fulfilledTimeStamp?: number
}

export type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | (({
      status: QueryStatus.fulfilled
    } & WithRequiredProp<
      BaseMutationSubState<D>,
      'data' | 'fulfilledTimeStamp'
    >) & { error: undefined })
  | (({
      status: QueryStatus.pending
    } & BaseMutationSubState<D>) & { data?: undefined })
  | ({
      status: QueryStatus.rejected
    } & WithRequiredProp<BaseMutationSubState<D>, 'error'>)
  | {
      requestId?: undefined
      status: QueryStatus.uninitialized
      data?: undefined
      error?: undefined
      endpointName?: string
      startedTimeStamp?: undefined
      fulfilledTimeStamp?: undefined
    }

export type CombinedState<
  D extends EndpointDefinitions,
  E extends string,
  ReducerPath extends string,
> = {
  queries: QueryState<D>
  mutations: MutationState<D>
  provided: InvalidationState<E>
  subscriptions: SubscriptionState
  config: ConfigState<ReducerPath>
}

export type InvalidationState<TagTypes extends string> = {
  [_ in TagTypes]: {
    [id: string]: Array<QueryCacheKey>
    [id: number]: Array<QueryCacheKey>
  }
}

export type QueryState<D extends EndpointDefinitions> = {
  [queryCacheKey: string]:
    | QuerySubState<D[string]>
    | InfiniteQuerySubState<D[string]>
    | undefined
}

export type SubscriptionState = {
  [queryCacheKey: string]: Subscribers | undefined
}

export type ConfigState<ReducerPath> = RefetchConfigOptions & {
  reducerPath: ReducerPath
  online: boolean
  focused: boolean
  middlewareRegistered: boolean | 'conflict'
} & ModifiableConfigState

export type ModifiableConfigState = {
  keepUnusedDataFor: number
  invalidationBehavior: 'delayed' | 'immediately'
} & RefetchConfigOptions

export type MutationState<D extends EndpointDefinitions> = {
  [requestId: string]: MutationSubState<D[string]> | undefined
}

export type RootState<
  Definitions extends EndpointDefinitions,
  TagTypes extends string,
  ReducerPath extends string,
> = {
  [P in ReducerPath]: CombinedState<Definitions, TagTypes, P>
}
