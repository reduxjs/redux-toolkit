import type {
  Selector,
  ThunkAction,
  ThunkDispatch,
  UnknownAction,
} from '@reduxjs/toolkit'
import type {
  Api,
  ApiContext,
  ApiEndpointMutation,
  ApiEndpointQuery,
  BaseQueryFn,
  CoreModule,
  EndpointDefinitions,
  MutationActionCreatorResult,
  MutationDefinition,
  MutationResultSelectorResult,
  PrefetchOptions,
  QueryActionCreatorResult,
  QueryArgFrom,
  QueryCacheKey,
  QueryDefinition,
  QueryKeys,
  QueryResultSelectorResult,
  QuerySubState,
  ResultTypeFrom,
  RootState,
  SerializeQueryArgs,
  SkipToken,
  SubscriptionOptions,
  TSHelpersId,
  TSHelpersNoInfer,
  TSHelpersOverride,
} from '@reduxjs/toolkit/query'
import { QueryStatus, skipToken } from '@reduxjs/toolkit/query'
import type { DependencyList } from 'react'
import {
  useCallback,
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { shallowEqual } from 'react-redux'
import type { SubscriptionSelectors } from '../core'
import { defaultSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type { UninitializedValue } from './constants'
import { UNINITIALIZED_VALUE } from './constants'
import type { ReactHooksModuleOptions } from './module'
import { useStableQueryArgs } from './useSerializedStableValue'
import { useShallowStableValue } from './useShallowStableValue'

// Copy-pasted from React-Redux
const canUseDOM = () =>
  !!(
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.document.createElement !== 'undefined'
  )

const isDOM = /* @__PURE__ */ canUseDOM()

// Under React Native, we know that we always want to use useLayoutEffect

const isRunningInReactNative = () =>
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

const isReactNative = /* @__PURE__ */ isRunningInReactNative()

const getUseIsomorphicLayoutEffect = () =>
  isDOM || isReactNative ? useLayoutEffect : useEffect

export const useIsomorphicLayoutEffect =
  /* @__PURE__ */ getUseIsomorphicLayoutEffect()

export type QueryHooks<
  Definition extends QueryDefinition<any, any, any, any, any>,
> = {
  useQuery: UseQuery<Definition>
  useLazyQuery: UseLazyQuery<Definition>
  useQuerySubscription: UseQuerySubscription<Definition>
  useLazyQuerySubscription: UseLazyQuerySubscription<Definition>
  useQueryState: UseQueryState<Definition>
}

export type MutationHooks<
  Definition extends MutationDefinition<any, any, any, any, any>,
> = {
  useMutation: UseMutation<Definition>
}

/**
 * A React hook that automatically triggers fetches of data from an endpoint, 'subscribes' the component to the cached data, and reads the request status and cached data from the Redux store. The component will re-render as the loading status changes and the data becomes available.
 *
 * The query arg is used as a cache key. Changing the query arg will tell the hook to re-fetch the data if it does not exist in the cache already, and the hook will return the data for that query arg once it's available.
 *
 * This hook combines the functionality of both [`useQueryState`](#usequerystate) and [`useQuerySubscription`](#usequerysubscription) together, and is intended to be used in the majority of situations.
 *
 * #### Features
 *
 * - Automatically triggers requests to retrieve data based on the hook argument and whether cached data exists by default
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export type UseQuery<D extends QueryDefinition<any, any, any, any>> = <
  R extends Record<string, any> = UseQueryStateDefaultResult<D>,
>(
  arg: QueryArgFrom<D> | SkipToken,
  options?: UseQuerySubscriptionOptions & UseQueryStateOptions<D, R>,
) => UseQueryHookResult<D, R>

export type TypedUseQuery<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseQuery<QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>>

export type UseQueryHookResult<
  D extends QueryDefinition<any, any, any, any>,
  R = UseQueryStateDefaultResult<D>,
> = UseQueryStateResult<D, R> & UseQuerySubscriptionResult<D>

/**
 * Helper type to manually type the result
 * of the `useQuery` hook in userland code.
 */
export type TypedUseQueryHookResult<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  R = UseQueryStateDefaultResult<
    QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
  >,
> = TypedUseQueryStateResult<ResultType, QueryArg, BaseQuery, R> &
  TypedUseQuerySubscriptionResult<ResultType, QueryArg, BaseQuery>

type UseQuerySubscriptionOptions = SubscriptionOptions & {
  /**
   * Prevents a query from automatically running.
   *
   * @remarks
   * When `skip` is true (or `skipToken` is passed in as `arg`):
   *
   * - **If the query has cached data:**
   *   * The cached data **will not be used** on the initial load, and will ignore updates from any identical query until the `skip` condition is removed
   *   * The query will have a status of `uninitialized`
   *   * If `skip: false` is set after the initial load, the cached result will be used
   * - **If the query does not have cached data:**
   *   * The query will have a status of `uninitialized`
   *   * The query will not exist in the state when viewed with the dev tools
   *   * The query will not automatically fetch on mount
   *   * The query will not automatically run when additional components with the same query are added that do run
   *
   * @example
   * ```tsx
   * // codeblock-meta no-transpile title="Skip example"
   * const Pokemon = ({ name, skip }: { name: string; skip: boolean }) => {
   *   const { data, error, status } = useGetPokemonByNameQuery(name, {
   *     skip,
   *   });
   *
   *   return (
   *     <div>
   *       {name} - {status}
   *     </div>
   *   );
   * };
   * ```
   */
  skip?: boolean
  /**
   * Defaults to `false`. This setting allows you to control whether if a cached result is already available, RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.
   * - `false` - Will not cause a query to be performed _unless_ it does not exist yet.
   * - `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
   * - `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.
   *
   * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
   */
  refetchOnMountOrArgChange?: boolean | number
}

/**
 * A React hook that automatically triggers fetches of data from an endpoint, and 'subscribes' the component to the cached data.
 *
 * The query arg is used as a cache key. Changing the query arg will tell the hook to re-fetch the data if it does not exist in the cache already.
 *
 * Note that this hook does not return a request status or cached data. For that use-case, see [`useQuery`](#usequery) or [`useQueryState`](#usequerystate).
 *
 * #### Features
 *
 * - Automatically triggers requests to retrieve data based on the hook argument and whether cached data exists by default
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met
 */
export type UseQuerySubscription<
  D extends QueryDefinition<any, any, any, any>,
> = (
  arg: QueryArgFrom<D> | SkipToken,
  options?: UseQuerySubscriptionOptions,
) => UseQuerySubscriptionResult<D>

export type TypedUseQuerySubscription<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseQuerySubscription<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

export type UseQuerySubscriptionResult<
  D extends QueryDefinition<any, any, any, any>,
> = Pick<QueryActionCreatorResult<D>, 'refetch'>

/**
 * Helper type to manually type the result
 * of the `useQuerySubscription` hook in userland code.
 */
export type TypedUseQuerySubscriptionResult<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseQuerySubscriptionResult<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

export type UseLazyQueryLastPromiseInfo<
  D extends QueryDefinition<any, any, any, any>,
> = {
  lastArg: QueryArgFrom<D>
}

/**
 * A React hook similar to [`useQuery`](#usequery), but with manual control over when the data fetching occurs.
 *
 * This hook includes the functionality of [`useLazyQuerySubscription`](#uselazyquerysubscription).
 *
 * #### Features
 *
 * - Manual control over firing a request to retrieve data
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met and the fetch has been manually called at least once
 *
 * #### Note
 *
 * When the trigger function returned from a LazyQuery is called, it always initiates a new request to the server even if there is cached data. Set `preferCacheValue`(the second argument to the function) as `true` if you want it to immediately return a cached value if one exists.
 */
export type UseLazyQuery<D extends QueryDefinition<any, any, any, any>> = <
  R extends Record<string, any> = UseQueryStateDefaultResult<D>,
>(
  options?: SubscriptionOptions & Omit<UseQueryStateOptions<D, R>, 'skip'>,
) => [
  LazyQueryTrigger<D>,
  UseLazyQueryStateResult<D, R>,
  UseLazyQueryLastPromiseInfo<D>,
]

export type TypedUseLazyQuery<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseLazyQuery<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

export type UseLazyQueryStateResult<
  D extends QueryDefinition<any, any, any, any>,
  R = UseQueryStateDefaultResult<D>,
> = UseQueryStateResult<D, R> & {
  /**
   * Resets the hook state to its initial `uninitialized` state.
   * This will also remove the last result from the cache.
   */
  reset: () => void
}

/**
 * Helper type to manually type the result
 * of the `useLazyQuery` hook in userland code.
 */
export type TypedUseLazyQueryStateResult<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  R = UseQueryStateDefaultResult<
    QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
  >,
> = UseLazyQueryStateResult<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>,
  R
>

export type LazyQueryTrigger<D extends QueryDefinition<any, any, any, any>> = {
  /**
   * Triggers a lazy query.
   *
   * By default, this will start a new request even if there is already a value in the cache.
   * If you want to use the cache value and only start a request if there is no cache value, set the second argument to `true`.
   *
   * @remarks
   * If you need to access the error or success payload immediately after a lazy query, you can chain .unwrap().
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using .unwrap with async await"
   * try {
   *   const payload = await getUserById(1).unwrap();
   *   console.log('fulfilled', payload)
   * } catch (error) {
   *   console.error('rejected', error);
   * }
   * ```
   */
  (
    arg: QueryArgFrom<D>,
    preferCacheValue?: boolean,
  ): QueryActionCreatorResult<D>
}

export type TypedLazyQueryTrigger<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = LazyQueryTrigger<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

/**
 * A React hook similar to [`useQuerySubscription`](#usequerysubscription), but with manual control over when the data fetching occurs.
 *
 * Note that this hook does not return a request status or cached data. For that use-case, see [`useLazyQuery`](#uselazyquery).
 *
 * #### Features
 *
 * - Manual control over firing a request to retrieve data
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Accepts polling/re-fetching options to trigger automatic re-fetches when the corresponding criteria is met and the fetch has been manually called at least once
 */
export type UseLazyQuerySubscription<
  D extends QueryDefinition<any, any, any, any>,
> = (
  options?: SubscriptionOptions,
) => readonly [
  LazyQueryTrigger<D>,
  QueryArgFrom<D> | UninitializedValue,
  { reset: () => void },
]

export type TypedUseLazyQuerySubscription<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseLazyQuerySubscription<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

/**
 * @internal
 */
export type QueryStateSelector<
  R extends Record<string, any>,
  D extends QueryDefinition<any, any, any, any>,
> = (state: UseQueryStateDefaultResult<D>) => R

/**
 * Provides a way to define a strongly-typed version of
 * {@linkcode QueryStateSelector} for use with a specific query.
 * This is useful for scenarios where you want to create a "pre-typed"
 * {@linkcode UseQueryStateOptions.selectFromResult | selectFromResult}
 * function.
 *
 * @example
 * <caption>#### __Create a strongly-typed `selectFromResult` selector function__</caption>
 *
 * ```tsx
 * import type { TypedQueryStateSelector } from '@reduxjs/toolkit/query/react'
 * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
 *
 * type Post = {
 *   id: number
 *   title: string
 * }
 *
 * type PostsApiResponse = {
 *   posts: Post[]
 *   total: number
 *   skip: number
 *   limit: number
 * }
 *
 * type QueryArgument = number | undefined
 *
 * type BaseQueryFunction = ReturnType<typeof fetchBaseQuery>
 *
 * type SelectedResult = Pick<PostsApiResponse, 'posts'>
 *
 * const postsApiSlice = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com/posts' }),
 *   reducerPath: 'postsApi',
 *   tagTypes: ['Posts'],
 *   endpoints: (build) => ({
 *     getPosts: build.query<PostsApiResponse, QueryArgument>({
 *       query: (limit = 5) => `?limit=${limit}&select=title`,
 *     }),
 *   }),
 * })
 *
 * const { useGetPostsQuery } = postsApiSlice
 *
 * function PostById({ id }: { id: number }) {
 *   const { post } = useGetPostsQuery(undefined, {
 *     selectFromResult: (state) => ({
 *       post: state.data?.posts.find((post) => post.id === id),
 *     }),
 *   })
 *
 *   return <li>{post?.title}</li>
 * }
 *
 * const EMPTY_ARRAY: Post[] = []
 *
 * const typedSelectFromResult: TypedQueryStateSelector<
 *   PostsApiResponse,
 *   QueryArgument,
 *   BaseQueryFunction,
 *   SelectedResult
 * > = (state) => ({ posts: state.data?.posts ?? EMPTY_ARRAY })
 *
 * function PostsList() {
 *   const { posts } = useGetPostsQuery(undefined, {
 *     selectFromResult: typedSelectFromResult,
 *   })
 *
 *   return (
 *     <div>
 *       <ul>
 *         {posts.map((post) => (
 *           <PostById key={post.id} id={post.id} />
 *         ))}
 *       </ul>
 *     </div>
 *   )
 * }
 * ```
 *
 * @template ResultType - The type of the result `data` returned by the query.
 * @template QueryArgumentType - The type of the argument passed into the query.
 * @template BaseQueryFunctionType - The type of the base query function being used.
 * @template SelectedResultType - The type of the selected result returned by the __`selectFromResult`__ function.
 *
 * @since 2.3.0
 * @public
 */
export type TypedQueryStateSelector<
  ResultType,
  QueryArgumentType,
  BaseQueryFunctionType extends BaseQueryFn,
  SelectedResultType extends Record<string, any> = UseQueryStateDefaultResult<
    QueryDefinition<
      QueryArgumentType,
      BaseQueryFunctionType,
      string,
      ResultType,
      string
    >
  >,
> = QueryStateSelector<
  SelectedResultType,
  QueryDefinition<
    QueryArgumentType,
    BaseQueryFunctionType,
    string,
    ResultType,
    string
  >
>

/**
 * A React hook that reads the request status and cached data from the Redux store. The component will re-render as the loading status changes and the data becomes available.
 *
 * Note that this hook does not trigger fetching new data. For that use-case, see [`useQuery`](#usequery) or [`useQuerySubscription`](#usequerysubscription).
 *
 * #### Features
 *
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export type UseQueryState<D extends QueryDefinition<any, any, any, any>> = <
  R extends Record<string, any> = UseQueryStateDefaultResult<D>,
>(
  arg: QueryArgFrom<D> | SkipToken,
  options?: UseQueryStateOptions<D, R>,
) => UseQueryStateResult<D, R>

export type TypedUseQueryState<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseQueryState<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

/**
 * @internal
 */
export type UseQueryStateOptions<
  D extends QueryDefinition<any, any, any, any>,
  R extends Record<string, any>,
> = {
  /**
   * Prevents a query from automatically running.
   *
   * @remarks
   * When skip is true:
   *
   * - **If the query has cached data:**
   *   * The cached data **will not be used** on the initial load, and will ignore updates from any identical query until the `skip` condition is removed
   *   * The query will have a status of `uninitialized`
   *   * If `skip: false` is set after skipping the initial load, the cached result will be used
   * - **If the query does not have cached data:**
   *   * The query will have a status of `uninitialized`
   *   * The query will not exist in the state when viewed with the dev tools
   *   * The query will not automatically fetch on mount
   *   * The query will not automatically run when additional components with the same query are added that do run
   *
   * @example
   * ```ts
   * // codeblock-meta title="Skip example"
   * const Pokemon = ({ name, skip }: { name: string; skip: boolean }) => {
   *   const { data, error, status } = useGetPokemonByNameQuery(name, {
   *     skip,
   *   });
   *
   *   return (
   *     <div>
   *       {name} - {status}
   *     </div>
   *   );
   * };
   * ```
   */
  skip?: boolean
  /**
   * `selectFromResult` allows you to get a specific segment from a query result in a performant manner.
   * When using this feature, the component will not rerender unless the underlying data of the selected item has changed.
   * If the selected item is one element in a larger collection, it will disregard changes to elements in the same collection.
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using selectFromResult to extract a single result"
   * function PostsList() {
   *   const { data: posts } = api.useGetPostsQuery();
   *
   *   return (
   *     <ul>
   *       {posts?.data?.map((post) => (
   *         <PostById key={post.id} id={post.id} />
   *       ))}
   *     </ul>
   *   );
   * }
   *
   * function PostById({ id }: { id: number }) {
   *   // Will select the post with the given id, and will only rerender if the given posts data changes
   *   const { post } = api.useGetPostsQuery(undefined, {
   *     selectFromResult: ({ data }) => ({ post: data?.find((post) => post.id === id) }),
   *   });
   *
   *   return <li>{post?.name}</li>;
   * }
   * ```
   */
  selectFromResult?: QueryStateSelector<R, D>
}

/**
 * Provides a way to define a "pre-typed" version of
 * {@linkcode UseQueryStateOptions} with specific options for a given query.
 * This is particularly useful for setting default query behaviors such as
 * refetching strategies, which can be overridden as needed.
 *
 * @example
 * <caption>#### __Create a `useQuery` hook with default options__</caption>
 *
 * ```ts
 * import type {
 *   SubscriptionOptions,
 *   TypedUseQueryStateOptions,
 * } from '@reduxjs/toolkit/query/react'
 * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
 *
 * type Post = {
 *   id: number
 *   name: string
 * }
 *
 * const api = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
 *   tagTypes: ['Post'],
 *   endpoints: (build) => ({
 *     getPosts: build.query<Post[], void>({
 *       query: () => 'posts',
 *     }),
 *   }),
 * })
 *
 * const { useGetPostsQuery } = api
 *
 * export const useGetPostsQueryWithDefaults = <
 *   SelectedResult extends Record<string, any>,
 * >(
 *   overrideOptions: TypedUseQueryStateOptions<
 *     Post[],
 *     void,
 *     ReturnType<typeof fetchBaseQuery>,
 *     SelectedResult
 *   > &
 *     SubscriptionOptions,
 * ) =>
 *   useGetPostsQuery(undefined, {
 *     // Insert default options here
 *
 *     refetchOnMountOrArgChange: true,
 *     refetchOnFocus: true,
 *     ...overrideOptions,
 *   })
 * ```
 *
 * @template ResultType - The type of the result `data` returned by the query.
 * @template QueryArg - The type of the argument passed into the query.
 * @template BaseQuery - The type of the base query function being used.
 * @template SelectedResult - The type of the selected result returned by the __`selectFromResult`__ function.
 *
 * @since 2.2.8
 * @public
 */
export type TypedUseQueryStateOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  SelectedResult extends Record<string, any> = UseQueryStateDefaultResult<
    QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
  >,
> = UseQueryStateOptions<
  QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>,
  SelectedResult
>

export type UseQueryStateResult<
  _ extends QueryDefinition<any, any, any, any>,
  R,
> = TSHelpersNoInfer<R>

/**
 * Helper type to manually type the result
 * of the `useQueryState` hook in userland code.
 */
export type TypedUseQueryStateResult<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  R = UseQueryStateDefaultResult<
    QueryDefinition<QueryArg, BaseQuery, string, ResultType, string>
  >,
> = TSHelpersNoInfer<R>

type UseQueryStateBaseResult<D extends QueryDefinition<any, any, any, any>> =
  QuerySubState<D> & {
    /**
     * Where `data` tries to hold data as much as possible, also re-using
     * data from the last arguments passed into the hook, this property
     * will always contain the received data from the query, for the current query arguments.
     */
    currentData?: ResultTypeFrom<D>
    /**
     * Query has not started yet.
     */
    isUninitialized: false
    /**
     * Query is currently loading for the first time. No data yet.
     */
    isLoading: false
    /**
     * Query is currently fetching, but might have data from an earlier request.
     */
    isFetching: false
    /**
     * Query has data from a successful load.
     */
    isSuccess: false
    /**
     * Query is currently in "error" state.
     */
    isError: false
  }

type UseQueryStateDefaultResult<D extends QueryDefinition<any, any, any, any>> =
  TSHelpersId<
    | TSHelpersOverride<
        Extract<
          UseQueryStateBaseResult<D>,
          { status: QueryStatus.uninitialized }
        >,
        { isUninitialized: true }
      >
    | TSHelpersOverride<
        UseQueryStateBaseResult<D>,
        | { isLoading: true; isFetching: boolean; data: undefined }
        | ({
            isSuccess: true
            isFetching: true
            error: undefined
          } & Required<
            Pick<UseQueryStateBaseResult<D>, 'data' | 'fulfilledTimeStamp'>
          >)
        | ({
            isSuccess: true
            isFetching: false
            error: undefined
          } & Required<
            Pick<
              UseQueryStateBaseResult<D>,
              'data' | 'fulfilledTimeStamp' | 'currentData'
            >
          >)
        | ({ isError: true } & Required<
            Pick<UseQueryStateBaseResult<D>, 'error'>
          >)
      >
  > & {
    /**
     * @deprecated Included for completeness, but discouraged.
     * Please use the `isLoading`, `isFetching`, `isSuccess`, `isError`
     * and `isUninitialized` flags instead
     */
    status: QueryStatus
  }

export type MutationStateSelector<
  R extends Record<string, any>,
  D extends MutationDefinition<any, any, any, any>,
> = (state: MutationResultSelectorResult<D>) => R

export type UseMutationStateOptions<
  D extends MutationDefinition<any, any, any, any>,
  R extends Record<string, any>,
> = {
  selectFromResult?: MutationStateSelector<R, D>
  fixedCacheKey?: string
}

export type UseMutationStateResult<
  D extends MutationDefinition<any, any, any, any>,
  R,
> = TSHelpersNoInfer<R> & {
  originalArgs?: QueryArgFrom<D>
  /**
   * Resets the hook state to its initial `uninitialized` state.
   * This will also remove the last result from the cache.
   */
  reset: () => void
}

/**
 * Helper type to manually type the result
 * of the `useMutation` hook in userland code.
 */
export type TypedUseMutationResult<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  R = MutationResultSelectorResult<
    MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>
  >,
> = UseMutationStateResult<
  MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>,
  R
>

/**
 * A React hook that lets you trigger an update request for a given endpoint, and subscribes the component to read the request status from the Redux store. The component will re-render as the loading status changes.
 *
 * #### Features
 *
 * - Manual control over firing a request to alter data on the server or possibly invalidate the cache
 * - 'Subscribes' the component to keep cached data in the store, and 'unsubscribes' when the component unmounts
 * - Returns the latest request status and cached data from the Redux store
 * - Re-renders as the request status changes and data becomes available
 */
export type UseMutation<D extends MutationDefinition<any, any, any, any>> = <
  R extends Record<string, any> = MutationResultSelectorResult<D>,
>(
  options?: UseMutationStateOptions<D, R>,
) => readonly [MutationTrigger<D>, UseMutationStateResult<D, R>]

export type TypedUseMutation<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = UseMutation<
  MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

export type MutationTrigger<D extends MutationDefinition<any, any, any, any>> =
  {
    /**
     * Triggers the mutation and returns a Promise.
     * @remarks
     * If you need to access the error or success payload immediately after a mutation, you can chain .unwrap().
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
    (arg: QueryArgFrom<D>): MutationActionCreatorResult<D>
  }

export type TypedMutationTrigger<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
> = MutationTrigger<
  MutationDefinition<QueryArg, BaseQuery, string, ResultType, string>
>

/**
 * Wrapper around `defaultQueryStateSelector` to be used in `useQuery`.
 * We want the initial render to already come back with
 * `{ isUninitialized: false, isFetching: true, isLoading: true }`
 * to prevent that the library user has to do an additional check for `isUninitialized`/
 */
const noPendingQueryStateSelector: QueryStateSelector<any, any> = (
  selected,
) => {
  if (selected.isUninitialized) {
    return {
      ...selected,
      isUninitialized: false,
      isFetching: true,
      isLoading: selected.data !== undefined ? false : true,
      status: QueryStatus.pending,
    } as any
  }
  return selected
}

type GenericPrefetchThunk = (
  endpointName: any,
  arg: any,
  options: PrefetchOptions,
) => ThunkAction<void, any, any, UnknownAction>

/**
 *
 * @param opts.api - An API with defined endpoints to create hooks for
 * @param opts.moduleOptions.batch - The version of the `batchedUpdates` function to be used
 * @param opts.moduleOptions.useDispatch - The version of the `useDispatch` hook to be used
 * @param opts.moduleOptions.useSelector - The version of the `useSelector` hook to be used
 * @returns An object containing functions to generate hooks based on an endpoint
 */
export function buildHooks<Definitions extends EndpointDefinitions>({
  api,
  moduleOptions: {
    batch,
    hooks: { useDispatch, useSelector, useStore },
    unstable__sideEffectsInRender,
    createSelector,
  },
  serializeQueryArgs,
  context,
}: {
  api: Api<any, Definitions, any, any, CoreModule>
  moduleOptions: Required<ReactHooksModuleOptions>
  serializeQueryArgs: SerializeQueryArgs<any>
  context: ApiContext<Definitions>
}) {
  const usePossiblyImmediateEffect: (
    effect: () => void | undefined,
    deps?: DependencyList,
  ) => void = unstable__sideEffectsInRender ? (cb) => cb() : useEffect

  return { buildQueryHooks, buildMutationHook, usePrefetch }

  function queryStatePreSelector(
    currentState: QueryResultSelectorResult<any>,
    lastResult: UseQueryStateDefaultResult<any> | undefined,
    queryArgs: any,
  ): UseQueryStateDefaultResult<any> {
    // if we had a last result and the current result is uninitialized,
    // we might have called `api.util.resetApiState`
    // in this case, reset the hook
    if (lastResult?.endpointName && currentState.isUninitialized) {
      const { endpointName } = lastResult
      const endpointDefinition = context.endpointDefinitions[endpointName]
      if (
        serializeQueryArgs({
          queryArgs: lastResult.originalArgs,
          endpointDefinition,
          endpointName,
        }) ===
        serializeQueryArgs({
          queryArgs,
          endpointDefinition,
          endpointName,
        })
      )
        lastResult = undefined
    }

    // data is the last known good request result we have tracked - or if none has been tracked yet the last good result for the current args
    let data = currentState.isSuccess ? currentState.data : lastResult?.data
    if (data === undefined) data = currentState.data

    const hasData = data !== undefined

    // isFetching = true any time a request is in flight
    const isFetching = currentState.isLoading

    // isLoading = true only when loading while no data is present yet (initial load with no data in the cache)
    const isLoading =
      (!lastResult || lastResult.isLoading || lastResult.isUninitialized) &&
      !hasData &&
      isFetching

    // isSuccess = true when data is present and we're not refetching after an error.
    // That includes cases where the _current_ item is either actively
    // fetching or about to fetch due to an uninitialized entry.
    const isSuccess =
      currentState.isSuccess ||
      (hasData &&
        ((isFetching && !lastResult?.isError) || currentState.isUninitialized))

    return {
      ...currentState,
      data,
      currentData: currentState.data,
      isFetching,
      isLoading,
      isSuccess,
    } as UseQueryStateDefaultResult<any>
  }

  function usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    defaultOptions?: PrefetchOptions,
  ) {
    const dispatch = useDispatch<ThunkDispatch<any, any, UnknownAction>>()
    const stableDefaultOptions = useShallowStableValue(defaultOptions)

    return useCallback(
      (arg: any, options?: PrefetchOptions) =>
        dispatch(
          (api.util.prefetch as GenericPrefetchThunk)(endpointName, arg, {
            ...stableDefaultOptions,
            ...options,
          }),
        ),
      [endpointName, dispatch, stableDefaultOptions],
    )
  }

  function buildQueryHooks(name: string): QueryHooks<any> {
    const useQuerySubscription: UseQuerySubscription<any> = (
      arg: any,
      {
        refetchOnReconnect,
        refetchOnFocus,
        refetchOnMountOrArgChange,
        skip = false,
        pollingInterval = 0,
        skipPollingIfUnfocused = false,
      } = {},
    ) => {
      const { initiate } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >
      const dispatch = useDispatch<ThunkDispatch<any, any, UnknownAction>>()

      // TODO: Change this to `useRef<SubscriptionSelectors>(undefined)` after upgrading to React 19.
      /**
       * @todo Change this to `useRef<SubscriptionSelectors>(undefined)` after upgrading to React 19.
       */
      const subscriptionSelectorsRef = useRef<
        SubscriptionSelectors | undefined
      >(undefined)

      if (!subscriptionSelectorsRef.current) {
        const returnedValue = dispatch(
          api.internalActions.internal_getRTKQSubscriptions(),
        )

        if (process.env.NODE_ENV !== 'production') {
          if (
            typeof returnedValue !== 'object' ||
            typeof returnedValue?.type === 'string'
          ) {
            throw new Error(
              `Warning: Middleware for RTK-Query API at reducerPath "${api.reducerPath}" has not been added to the store.
    You must add the middleware for RTK-Query to function correctly!`,
            )
          }
        }

        subscriptionSelectorsRef.current =
          returnedValue as unknown as SubscriptionSelectors
      }
      const stableArg = useStableQueryArgs(
        skip ? skipToken : arg,
        // Even if the user provided a per-endpoint `serializeQueryArgs` with
        // a consistent return value, _here_ we want to use the default behavior
        // so we can tell if _anything_ actually changed. Otherwise, we can end up
        // with a case where the query args did change but the serialization doesn't,
        // and then we never try to initiate a refetch.
        defaultSerializeQueryArgs,
        context.endpointDefinitions[name],
        name,
      )
      const stableSubscriptionOptions = useShallowStableValue({
        refetchOnReconnect,
        refetchOnFocus,
        pollingInterval,
        skipPollingIfUnfocused,
      })

      const lastRenderHadSubscription = useRef(false)

      // TODO: Change this to `useRef<QueryActionCreatorResult<any>>(undefined)` after upgrading to React 19.
      /**
       * @todo Change this to `useRef<QueryActionCreatorResult<any>>(undefined)` after upgrading to React 19.
       */
      const promiseRef = useRef<QueryActionCreatorResult<any> | undefined>(
        undefined,
      )

      let { queryCacheKey, requestId } = promiseRef.current || {}

      // HACK We've saved the middleware subscription lookup callbacks into a ref,
      // so we can directly check here if the subscription exists for this query.
      let currentRenderHasSubscription = false
      if (queryCacheKey && requestId) {
        currentRenderHasSubscription =
          subscriptionSelectorsRef.current.isRequestSubscribed(
            queryCacheKey,
            requestId,
          )
      }

      const subscriptionRemoved =
        !currentRenderHasSubscription && lastRenderHadSubscription.current

      usePossiblyImmediateEffect(() => {
        lastRenderHadSubscription.current = currentRenderHasSubscription
      })

      usePossiblyImmediateEffect((): void | undefined => {
        if (subscriptionRemoved) {
          promiseRef.current = undefined
        }
      }, [subscriptionRemoved])

      usePossiblyImmediateEffect((): void | undefined => {
        const lastPromise = promiseRef.current
        if (
          typeof process !== 'undefined' &&
          process.env.NODE_ENV === 'removeMeOnCompilation'
        ) {
          // this is only present to enforce the rule of hooks to keep `isSubscribed` in the dependency array
          console.log(subscriptionRemoved)
        }

        if (stableArg === skipToken) {
          lastPromise?.unsubscribe()
          promiseRef.current = undefined
          return
        }

        const lastSubscriptionOptions = promiseRef.current?.subscriptionOptions

        if (!lastPromise || lastPromise.arg !== stableArg) {
          lastPromise?.unsubscribe()
          const promise = dispatch(
            initiate(stableArg, {
              subscriptionOptions: stableSubscriptionOptions,
              forceRefetch: refetchOnMountOrArgChange,
            }),
          )

          promiseRef.current = promise
        } else if (stableSubscriptionOptions !== lastSubscriptionOptions) {
          lastPromise.updateSubscriptionOptions(stableSubscriptionOptions)
        }
      }, [
        dispatch,
        initiate,
        refetchOnMountOrArgChange,
        stableArg,
        stableSubscriptionOptions,
        subscriptionRemoved,
      ])

      useEffect(() => {
        return () => {
          promiseRef.current?.unsubscribe()
          promiseRef.current = undefined
        }
      }, [])

      return useMemo(
        () => ({
          /**
           * A method to manually refetch data for the query
           */
          refetch: () => {
            if (!promiseRef.current)
              throw new Error(
                'Cannot refetch a query that has not been started yet.',
              )
            return promiseRef.current?.refetch()
          },
        }),
        [],
      )
    }

    const useLazyQuerySubscription: UseLazyQuerySubscription<any> = ({
      refetchOnReconnect,
      refetchOnFocus,
      pollingInterval = 0,
      skipPollingIfUnfocused = false,
    } = {}) => {
      const { initiate } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >
      const dispatch = useDispatch<ThunkDispatch<any, any, UnknownAction>>()

      const [arg, setArg] = useState<any>(UNINITIALIZED_VALUE)

      // TODO: Change this to `useRef<QueryActionCreatorResult<any>>(undefined)` after upgrading to React 19.
      /**
       * @todo Change this to `useRef<QueryActionCreatorResult<any>>(undefined)` after upgrading to React 19.
       */
      const promiseRef = useRef<QueryActionCreatorResult<any> | undefined>(
        undefined,
      )

      const stableSubscriptionOptions = useShallowStableValue({
        refetchOnReconnect,
        refetchOnFocus,
        pollingInterval,
        skipPollingIfUnfocused,
      })

      usePossiblyImmediateEffect(() => {
        const lastSubscriptionOptions = promiseRef.current?.subscriptionOptions

        if (stableSubscriptionOptions !== lastSubscriptionOptions) {
          promiseRef.current?.updateSubscriptionOptions(
            stableSubscriptionOptions,
          )
        }
      }, [stableSubscriptionOptions])

      const subscriptionOptionsRef = useRef(stableSubscriptionOptions)
      usePossiblyImmediateEffect(() => {
        subscriptionOptionsRef.current = stableSubscriptionOptions
      }, [stableSubscriptionOptions])

      const trigger = useCallback(
        function (arg: any, preferCacheValue = false) {
          let promise: QueryActionCreatorResult<any>

          batch(() => {
            promiseRef.current?.unsubscribe()

            promiseRef.current = promise = dispatch(
              initiate(arg, {
                subscriptionOptions: subscriptionOptionsRef.current,
                forceRefetch: !preferCacheValue,
              }),
            )

            setArg(arg)
          })

          return promise!
        },
        [dispatch, initiate],
      )

      const reset = useCallback(() => {
        if (promiseRef.current?.queryCacheKey) {
          dispatch(
            api.internalActions.removeQueryResult({
              queryCacheKey: promiseRef.current?.queryCacheKey as QueryCacheKey,
            }),
          )
        }
      }, [dispatch])

      /* cleanup on unmount */
      useEffect(() => {
        return () => {
          promiseRef?.current?.unsubscribe()
        }
      }, [])

      /* if "cleanup on unmount" was triggered from a fast refresh, we want to reinstate the query */
      useEffect(() => {
        if (arg !== UNINITIALIZED_VALUE && !promiseRef.current) {
          trigger(arg, true)
        }
      }, [arg, trigger])

      return useMemo(
        () => [trigger, arg, { reset }] as const,
        [trigger, arg, reset],
      )
    }

    const useQueryState: UseQueryState<any> = (
      arg: any,
      { skip = false, selectFromResult } = {},
    ) => {
      const { select } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >
      const stableArg = useStableQueryArgs(
        skip ? skipToken : arg,
        serializeQueryArgs,
        context.endpointDefinitions[name],
        name,
      )

      type ApiRootState = Parameters<ReturnType<typeof select>>[0]

      const lastValue = useRef<any>(undefined)

      const selectDefaultResult: Selector<ApiRootState, any, [any]> = useMemo(
        () =>
          createSelector(
            [
              select(stableArg),
              (_: ApiRootState, lastResult: any) => lastResult,
              (_: ApiRootState) => stableArg,
            ],
            queryStatePreSelector,
            {
              memoizeOptions: {
                resultEqualityCheck: shallowEqual,
              },
            },
          ),
        [select, stableArg],
      )

      const querySelector: Selector<ApiRootState, any, [any]> = useMemo(
        () =>
          selectFromResult
            ? createSelector([selectDefaultResult], selectFromResult, {
                devModeChecks: { identityFunctionCheck: 'never' },
              })
            : selectDefaultResult,
        [selectDefaultResult, selectFromResult],
      )

      const currentState = useSelector(
        (state: RootState<Definitions, any, any>) =>
          querySelector(state, lastValue.current),
        shallowEqual,
      )

      const store = useStore<RootState<Definitions, any, any>>()
      const newLastValue = selectDefaultResult(
        store.getState(),
        lastValue.current,
      )
      useIsomorphicLayoutEffect(() => {
        lastValue.current = newLastValue
      }, [newLastValue])

      return currentState
    }

    return {
      useQueryState,
      useQuerySubscription,
      useLazyQuerySubscription,
      useLazyQuery(options) {
        const [trigger, arg, { reset }] = useLazyQuerySubscription(options)
        const queryStateResults = useQueryState(arg, {
          ...options,
          skip: arg === UNINITIALIZED_VALUE,
        })

        const info = useMemo(() => ({ lastArg: arg }), [arg])
        return useMemo(
          () => [trigger, { ...queryStateResults, reset }, info],
          [trigger, queryStateResults, reset, info],
        )
      },
      useQuery(arg, options) {
        const querySubscriptionResults = useQuerySubscription(arg, options)
        const queryStateResults = useQueryState(arg, {
          selectFromResult:
            arg === skipToken || options?.skip
              ? undefined
              : noPendingQueryStateSelector,
          ...options,
        })

        const { data, status, isLoading, isSuccess, isError, error } =
          queryStateResults
        useDebugValue({ data, status, isLoading, isSuccess, isError, error })

        return useMemo(
          () => ({ ...queryStateResults, ...querySubscriptionResults }),
          [queryStateResults, querySubscriptionResults],
        )
      },
    }
  }

  function buildMutationHook(name: string): UseMutation<any> {
    return ({ selectFromResult, fixedCacheKey } = {}) => {
      const { select, initiate } = api.endpoints[name] as ApiEndpointMutation<
        MutationDefinition<any, any, any, any, any>,
        Definitions
      >
      const dispatch = useDispatch<ThunkDispatch<any, any, UnknownAction>>()
      const [promise, setPromise] = useState<MutationActionCreatorResult<any>>()

      useEffect(
        () => () => {
          if (!promise?.arg.fixedCacheKey) {
            promise?.reset()
          }
        },
        [promise],
      )

      const triggerMutation = useCallback(
        function (arg: Parameters<typeof initiate>['0']) {
          const promise = dispatch(initiate(arg, { fixedCacheKey }))
          setPromise(promise)
          return promise
        },
        [dispatch, initiate, fixedCacheKey],
      )

      const { requestId } = promise || {}
      const selectDefaultResult = useMemo(
        () => select({ fixedCacheKey, requestId: promise?.requestId }),
        [fixedCacheKey, promise, select],
      )
      const mutationSelector = useMemo(
        (): Selector<RootState<Definitions, any, any>, any> =>
          selectFromResult
            ? createSelector([selectDefaultResult], selectFromResult)
            : selectDefaultResult,
        [selectFromResult, selectDefaultResult],
      )

      const currentState = useSelector(mutationSelector, shallowEqual)
      const originalArgs =
        fixedCacheKey == null ? promise?.arg.originalArgs : undefined
      const reset = useCallback(() => {
        batch(() => {
          if (promise) {
            setPromise(undefined)
          }
          if (fixedCacheKey) {
            dispatch(
              api.internalActions.removeMutationResult({
                requestId,
                fixedCacheKey,
              }),
            )
          }
        })
      }, [dispatch, fixedCacheKey, promise, requestId])

      const {
        endpointName,
        data,
        status,
        isLoading,
        isSuccess,
        isError,
        error,
      } = currentState
      useDebugValue({
        endpointName,
        data,
        status,
        isLoading,
        isSuccess,
        isError,
        error,
      })

      const finalState = useMemo(
        () => ({ ...currentState, originalArgs, reset }),
        [currentState, originalArgs, reset],
      )

      return useMemo(
        () => [triggerMutation, finalState] as const,
        [triggerMutation, finalState],
      )
    }
  }
}
