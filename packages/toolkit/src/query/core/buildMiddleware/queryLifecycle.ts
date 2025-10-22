import type {
  BaseQueryError,
  BaseQueryFn,
  BaseQueryMeta,
} from '../../baseQueryTypes'
import { DefinitionType, isAnyQueryDefinition, isMutationDefinition } from '../../endpointDefinitions'
import type { EndpointDefinitions, QueryArgFrom, ResultTypeFrom } from '../../endpointDefinitions'
import type { PatchCollection, Recipe } from '../buildThunks'
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

type QueryLifecyclePromises<ResultType, BaseQuery extends BaseQueryFn> = {
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

export type QueryLifecycleQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
> = {
  /**
   * A function that is called when the individual query is started. The function is called with a lifecycle api object containing properties such as `queryFulfilled`, allowing code to be run when a query is started, when it succeeds, and when it fails (i.e. throughout the lifecycle of an individual query/mutation call).
   *
   * Can be used to perform side-effects throughout the lifecycle of the query.
   *
   * @example
   * ```ts
   * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
   * import { messageCreated } from './notificationsSlice
   * export interface Post {
   *   id: number
   *   name: string
   * }
   *
   * const api = createApi({
   *   baseQuery: fetchBaseQuery({
   *     baseUrl: '/',
   *   }),
   *   endpoints: (build) => ({
   *     getPost: build.query<Post, number>({
   *       query: (id) => `post/${id}`,
   *       async onQueryStarted(id, { dispatch, queryFulfilled }) {
   *         // `onStart` side-effect
   *         dispatch(messageCreated('Fetching posts...'))
   *         try {
   *           const { data } = await queryFulfilled
   *           // `onSuccess` side-effect
   *           dispatch(messageCreated('Posts received!'))
   *         } catch (err) {
   *           // `onError` side-effect
   *           dispatch(messageCreated('Error fetching posts!'))
   *         }
   *       }
   *     }),
   *   }),
   * })
   * ```
   */
  onQueryStarted?(
    queryArgument: QueryArg,
    queryLifeCycleApi: QueryLifecycleApi<
      QueryArg,
      BaseQuery,
      ResultType,
      ReducerPath
    >,
  ): Promise<void> | void
}

export type QueryLifecycleInfiniteQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
> = QueryLifecycleQueryExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery,
  ReducerPath
>

export type QueryLifecycleMutationExtraOptions<
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
  Definitions extends EndpointDefinitions = EndpointDefinitions,
> = {
  /**
   * A function that is called when the individual mutation is started. The function is called with a lifecycle api object containing properties such as `queryFulfilled`, allowing code to be run when a query is started, when it succeeds, and when it fails (i.e. throughout the lifecycle of an individual query/mutation call).
   *
   * Can be used for `optimistic updates`, side effects, and complex logic.
   *
   * **Note**: For simple optimistic updates, consider using the declarative `applyOptimistic` option instead.
   * Use `onQueryStarted` when you need:
   * - Conditional logic before applying updates
   * - Side effects (logging, analytics, notifications)
   * - Complex error handling
   * - Access to additional state via `getState()`
   *
   * @example
   *
   * ```ts
   * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
   * export interface Post {
   *   id: number
   *   name: string
   * }
   *
   * const api = createApi({
   *   baseQuery: fetchBaseQuery({
   *     baseUrl: '/',
   *   }),
   *   tagTypes: ['Post'],
   *   endpoints: (build) => ({
   *     getPost: build.query<Post, number>({
   *       query: (id) => `post/${id}`,
   *       providesTags: ['Post'],
   *     }),
   *     updatePost: build.mutation<void, Pick<Post, 'id'> & Partial<Post>>({
   *       query: ({ id, ...patch }) => ({
   *         url: `post/${id}`,
   *         method: 'PATCH',
   *         body: patch,
   *       }),
   *       invalidatesTags: ['Post'],
   *       // Traditional manual approach (now simplified with applyOptimistic option)
   *       async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
   *         const patchResult = dispatch(
   *           api.util.updateQueryData('getPost', id, (draft) => {
   *             Object.assign(draft, patch)
   *           })
   *         )
   *         try {
   *           await queryFulfilled
   *         } catch {
   *           patchResult.undo()
   *         }
   *       },
   *     }),
   *   }),
   * })
   * ```
   */
  onQueryStarted?(
    queryArgument: QueryArg,
    mutationLifeCycleApi: MutationLifecycleApi<
      QueryArg,
      BaseQuery,
      ResultType,
      ReducerPath
    >,
  ): Promise<void> | void

  /**
   * A declarative way to apply optimistic updates when the mutation starts.
   * Returns an array of PatchCollections that will be automatically rolled back if the mutation fails.
   *
   * This is the **recommended approach** for most optimistic update use cases as it handles
   * the try/catch logic automatically and provides a cleaner API.
   *
   * If the mutation succeeds, the optimistic updates remain.
   * If the mutation fails, all optimistic updates are automatically rolled back.
   *
   * @example
   * ```ts
   * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
   *
   * const api = createApi({
   *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
   *   endpoints: (build) => ({
   *     getPost: build.query<Post, number>({
   *       query: (id) => `post/${id}`,
   *     }),
   *     updatePost: build.mutation<Post, Pick<Post, 'id'> & Partial<Post>>({
   *       query: ({ id, ...patch }) => ({
   *         url: `post/${id}`,
   *         method: 'PATCH',
   *         body: patch,
   *       }),
   *       // Declarative optimistic updates - runs automatically when mutation starts
   *       applyOptimistic: ({ id, ...patch }, { optimisticUpdate }) => [
   *         // Simple case - update cache entries within this API
   *         optimisticUpdate('getPost', id, (draft) => {
   *           Object.assign(draft, patch)
   *         }),
   *         // Complex case - can still use other APIs for cross-API updates
   *         // anotherApi.util.updateQueryData('otherEndpoint', id, ...)
   *       ]
   *     }),
   *   }),
   * })
   * ```
   */
  applyOptimistic?(
    queryArgument: QueryArg,
    helpers: {
      /**
       * Simplified helper to update cache entries for endpoints within this API.
       * Equivalent to calling `dispatch(api.util.updateQueryData(...))` but with cleaner syntax.
       */
      optimisticUpdate: <EndpointName extends keyof Definitions>(
        endpointName: EndpointName,
        arg: QueryArgFrom<Definitions[EndpointName]>,
        updateRecipe: Recipe<ResultTypeFrom<Definitions[EndpointName]>>
      ) => PatchCollection
      /**
       * Access to the full mutation lifecycle API for complex cases
       */
      lifecycleApi: MutationLifecycleApi<QueryArg, BaseQuery, ResultType, ReducerPath>
    }
  ): PatchCollection[]
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
  QueryLifecyclePromises<ResultType, BaseQuery> & {
    /**
     * Imperative helper function to apply optimistic updates with automatic rollback on failure.
     * Use this method inside `onQueryStarted` when you need conditional logic or complex control flow.
     *
     * For simple cases, prefer the declarative `applyOptimistic` option instead.
     *
     * @param patchCollections Array of PatchCollections to apply optimistically
     * @returns Promise that resolves when the mutation completes successfully, or rejects and automatically rolls back updates on failure
     *
     * @example
     * ```ts
     * // For conditional optimistic updates inside onQueryStarted:
     * updatePost: build.mutation<Post, UpdateArg>({
     *   query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
     *   async onQueryStarted({ id, ...patch }, { dispatch, applyOptimistic, getState }) {
     *     // Only apply optimistic update if user is premium
     *     if (getState().user.isPremium) {
     *       await applyOptimistic([
     *         dispatch(
     *           api.util.updateQueryData('getPost', id, (draft) => {
     *             Object.assign(draft, patch)
     *           })
     *         )
     *       ])
     *     }
     *   }
     * })
     * ```
     */
    applyOptimistic(
      patchCollections: PatchCollection[]
    ): Promise<{ data: ResultType; meta: BaseQueryMeta<BaseQuery> }>
  }

/**
 * Provides a way to define a strongly-typed version of
 * {@linkcode QueryLifecycleQueryExtraOptions.onQueryStarted | onQueryStarted}
 * for a specific query.
 *
 * @example
 * <caption>#### __Create and reuse a strongly-typed `onQueryStarted` function__</caption>
 *
 * ```ts
 * import type { TypedQueryOnQueryStarted } from '@reduxjs/toolkit/query'
 * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
 *
 * type Post = {
 *   id: number
 *   title: string
 *   userId: number
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
 * const baseApiSlice = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
 *   reducerPath: 'postsApi',
 *   tagTypes: ['Posts'],
 *   endpoints: (build) => ({
 *     getPosts: build.query<PostsApiResponse, void>({
 *       query: () => `/posts`,
 *     }),
 *
 *     getPostById: build.query<Post, QueryArgument>({
 *       query: (postId) => `/posts/${postId}`,
 *     }),
 *   }),
 * })
 *
 * const updatePostOnFulfilled: TypedQueryOnQueryStarted<
 *   PostsApiResponse,
 *   QueryArgument,
 *   BaseQueryFunction,
 *   'postsApi'
 * > = async (queryArgument, { dispatch, queryFulfilled }) => {
 *   const result = await queryFulfilled
 *
 *   const { posts } = result.data
 *
 *   // Pre-fill the individual post entries with the results
 *   // from the list endpoint query
 *   dispatch(
 *     baseApiSlice.util.upsertQueryEntries(
 *       posts.map((post) => ({
 *         endpointName: 'getPostById',
 *         arg: post.id,
 *         value: post,
 *       })),
 *     ),
 *   )
 * }
 *
 * export const extendedApiSlice = baseApiSlice.injectEndpoints({
 *   endpoints: (build) => ({
 *     getPostsByUserId: build.query<PostsApiResponse, QueryArgument>({
 *       query: (userId) => `/posts/user/${userId}`,
 *
 *       onQueryStarted: updatePostOnFulfilled,
 *     }),
 *   }),
 * })
 * ```
 *
 * @template ResultType - The type of the result `data` returned by the query.
 * @template QueryArgumentType - The type of the argument passed into the query.
 * @template BaseQueryFunctionType - The type of the base query function being used.
 * @template ReducerPath - The type representing the `reducerPath` for the API slice.
 *
 * @since 2.4.0
 * @public
 */
export type TypedQueryOnQueryStarted<
  ResultType,
  QueryArgumentType,
  BaseQueryFunctionType extends BaseQueryFn,
  ReducerPath extends string = string,
> = QueryLifecycleQueryExtraOptions<
  ResultType,
  QueryArgumentType,
  BaseQueryFunctionType,
  ReducerPath
>['onQueryStarted']

/**
 * Provides a way to define a strongly-typed version of
 * {@linkcode QueryLifecycleMutationExtraOptions.onQueryStarted | onQueryStarted}
 * for a specific mutation.
 *
 * @example
 * <caption>#### __Create and reuse a strongly-typed `onQueryStarted` function__</caption>
 *
 * ```ts
 * import type { TypedMutationOnQueryStarted } from '@reduxjs/toolkit/query'
 * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
 *
 * type Post = {
 *   id: number
 *   title: string
 *   userId: number
 * }
 *
 * type PostsApiResponse = {
 *   posts: Post[]
 *   total: number
 *   skip: number
 *   limit: number
 * }
 *
 * type QueryArgument = Pick<Post, 'id'> & Partial<Post>
 *
 * type BaseQueryFunction = ReturnType<typeof fetchBaseQuery>
 *
 * const baseApiSlice = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
 *   reducerPath: 'postsApi',
 *   tagTypes: ['Posts'],
 *   endpoints: (build) => ({
 *     getPosts: build.query<PostsApiResponse, void>({
 *       query: () => `/posts`,
 *     }),
 *
 *     getPostById: build.query<Post, number>({
 *       query: (postId) => `/posts/${postId}`,
 *     }),
 *   }),
 * })
 *
 * const updatePostOnFulfilled: TypedMutationOnQueryStarted<
 *   Post,
 *   QueryArgument,
 *   BaseQueryFunction,
 *   'postsApi'
 * > = async ({ id, ...patch }, { dispatch, queryFulfilled }) => {
 *   const patchCollection = dispatch(
 *     baseApiSlice.util.updateQueryData('getPostById', id, (draftPost) => {
 *       Object.assign(draftPost, patch)
 *     }),
 *   )
 *
 *   try {
 *     await queryFulfilled
 *   } catch {
 *     patchCollection.undo()
 *   }
 * }
 *
 * export const extendedApiSlice = baseApiSlice.injectEndpoints({
 *   endpoints: (build) => ({
 *     addPost: build.mutation<Post, Omit<QueryArgument, 'id'>>({
 *       query: (body) => ({
 *         url: `posts/add`,
 *         method: 'POST',
 *         body,
 *       }),
 *
 *       onQueryStarted: updatePostOnFulfilled,
 *     }),
 *
 *     updatePost: build.mutation<Post, QueryArgument>({
 *       query: ({ id, ...patch }) => ({
 *         url: `post/${id}`,
 *         method: 'PATCH',
 *         body: patch,
 *       }),
 *
 *       onQueryStarted: updatePostOnFulfilled,
 *     }),
 *   }),
 * })
 * ```
 *
 * @template ResultType - The type of the result `data` returned by the query.
 * @template QueryArgumentType - The type of the argument passed into the query.
 * @template BaseQueryFunctionType - The type of the base query function being used.
 * @template ReducerPath - The type representing the `reducerPath` for the API slice.
 *
 * @since 2.4.0
 * @public
 */
export type TypedMutationOnQueryStarted<
  ResultType,
  QueryArgumentType,
  BaseQueryFunctionType extends BaseQueryFn,
  ReducerPath extends string = string,
> = QueryLifecycleMutationExtraOptions<
  ResultType,
  QueryArgumentType,
  BaseQueryFunctionType,
  ReducerPath
>['onQueryStarted']

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
    optimisticPatches?: PatchCollection[]
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
      const applyOptimisticDefinition = isMutationDefinition(endpointDefinition) 
        ? endpointDefinition.applyOptimistic 
        : undefined

      if (onQueryStarted || applyOptimisticDefinition) {
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
          isAnyQueryDefinition(endpointDefinition) ? originalArgs : requestId,
        )

        const extra = mwApi.dispatch((_, __, extra) => extra)

        const optimisticUpdate = (endpointName: string, arg: any, updateRecipe: Recipe<any>): PatchCollection => {
          // At runtime, these are just strings/objects, so we can call updateQueryData directly
          // The type safety is enforced at the TypeScript level in the applyOptimistic function signature
          return (api.util.updateQueryData as any)(endpointName, arg, updateRecipe)(mwApi.dispatch, mwApi.getState)
        }

        const applyOptimistic = async (
          patchCollections: PatchCollection[]
        ) => {
          lifecycle.optimisticPatches = patchCollections

          try {
            const result = await queryFulfilled
            // If successful, we keep the optimistic updates
            return result
          } catch (error) {
            // If failed, rollback all optimistic updates
            patchCollections.forEach(patch => patch.undo())
          }
        }

        const lifecycleApi = {
          ...mwApi,
          getCacheEntry: () => selector(mwApi.getState()),
          requestId,
          extra,
          updateCachedData: (isAnyQueryDefinition(endpointDefinition)
            ? (updateRecipe: Recipe<any>) =>
                mwApi.dispatch(
                  api.util.updateQueryData(
                    endpointName as never,
                    originalArgs as never,
                    updateRecipe,
                  ),
                )
            : undefined) as any,
          queryFulfilled,
          applyOptimistic,
        }

        if (applyOptimisticDefinition) {
          const patchCollections = applyOptimisticDefinition(originalArgs, {
            optimisticUpdate,
            lifecycleApi: lifecycleApi as any
          })
          if (patchCollections && patchCollections.length > 0) {
            applyOptimistic(patchCollections)
          }
        }

        if (onQueryStarted) {
          onQueryStarted(originalArgs, lifecycleApi as any)
        }
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
      const lifecycle = lifecycleMap[requestId]
      
      lifecycle?.reject({
        error: action.payload ?? action.error,
        isUnhandledError: !rejectedWithValue,
        meta: baseQueryMeta as any,
      })
      delete lifecycleMap[requestId]
    }
  }

  return handler
}
