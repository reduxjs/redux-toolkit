import RTKQueryReact = require('@reduxjs/toolkit/query/react')
import apiModule = require('./api.js')

namespace postsModule {
  import retry = RTKQueryReact.retry
  import apiSlice = apiModule.apiSlice

  export interface Post {
    id: number
    name: string
    fetched_at: string
  }

  export type PostsResponse = Post[]

  export interface User {
    first_name: string
    last_name: string
    email: string
    phone: string
  }

  export const postsApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
      login: build.mutation<{ token: string; user: User }, any>({
        query: (credentials: any) => ({
          url: 'login',
          method: 'POST',
          body: credentials,
        }),
        extraOptions: {
          backoff: () => {
            retry.fail({ fake: 'error' }) // We intentionally error once on login, and this breaks out of retrying. The next login attempt will succeed.
          },
        },
      }),
      getPosts: build.query<PostsResponse, void>({
        query: () => ({ url: 'posts' }),
        providesTags: (result = []) => [
          ...result.map(({ id }) => ({ type: 'Posts', id }) as const),
          { type: 'Posts' as const, id: 'LIST' },
        ],
      }),
      addPost: build.mutation<Post, Partial<Post>>({
        query: (body) => ({
          url: `posts`,
          method: 'POST',
          body,
        }),
        invalidatesTags: [{ type: 'Posts', id: 'LIST' }],
      }),
      getPost: build.query<Post, number>({
        query: (id) => `posts/${id}`,
        providesTags: (_post, _err, id) => [{ type: 'Posts', id }],
      }),
      updatePost: build.mutation<Post, Partial<Post>>({
        query(data) {
          const { id, ...body } = data
          return {
            url: `posts/${id}`,
            method: 'PUT',
            body,
          }
        },
        invalidatesTags: (post) => [{ type: 'Posts', id: post?.id }],
      }),
      deletePost: build.mutation<{ success: boolean; id: number }, number>({
        query(id) {
          return {
            url: `posts/${id}`,
            method: 'DELETE',
          }
        },
        invalidatesTags: (post) => [{ type: 'Posts', id: post?.id }],
      }),
      getErrorProne: build.query<{ success: boolean }, void>({
        query: () => 'error-prone',
      }),
    }),
  })

  export const {
    useAddPostMutation,
    useDeletePostMutation,
    useGetPostQuery,
    useGetPostsQuery,
    useLoginMutation,
    useUpdatePostMutation,
    useGetErrorProneQuery,
    useLazyGetErrorProneQuery,
    useLazyGetPostQuery,
    useLazyGetPostsQuery,
    endpoints,
    enhanceEndpoints,
    injectEndpoints,
    internalActions,
    middleware,
    reducer,
    reducerPath,
    usePrefetch,
    util,
  } = postsApi

  export const {
    addPost,
    deletePost,
    getErrorProne,
    getPost,
    getPosts,
    login,
    updatePost,
  } = endpoints

  export const {
    Types,
    initiate,
    matchFulfilled,
    matchPending,
    matchRejected,
    name,
    select,
    useMutation,
  } = addPost

  export const {
    Types: _Types,
    initiate: _initiate,
    matchFulfilled: _matchFulfilled,
    matchPending: _matchPending,
    matchRejected: _matchRejected,
    name: _name,
    select: _select,
    useMutation: _useMutation,
  } = deletePost

  export const {
    Types: __Types,
    initiate: __initiate,
    matchFulfilled: __matchFulfilled,
    matchPending: __matchPending,
    matchRejected: __matchRejected,
    name: __name,
    select: __select,
    useQueryState,
    useLazyQuery,
    useLazyQuerySubscription,
    useQuery,
    useQuerySubscription,
  } = getErrorProne

  export const {
    Types: ___Types,
    initiate: ___initiate,
    matchFulfilled: ___matchFulfilled,
    matchPending: ___matchPending,
    matchRejected: ___matchRejected,
    name: ___name,
    select: ___select,
    useQueryState: ___useQueryState,
    useLazyQuery: ___useLazyQuery,
    useLazyQuerySubscription: ___useLazyQuerySubscription,
    useQuery: ___useQuery,
    useQuerySubscription: ___useQuerySubscription,
  } = getPost

  export const {
    Types: ____Types,
    initiate: ____initiate,
    matchFulfilled: ____matchFulfilled,
    matchPending: ____matchPending,
    matchRejected: ____matchRejected,
    name: ____name,
    select: ____select,
    useMutation: ____useMutation,
  } = login

  export const {
    Types: _____Types,
    initiate: _____initiate,
    matchFulfilled: _____matchFulfilled,
    matchPending: _____matchPending,
    matchRejected: _____matchRejected,
    name: _____name,
    select: _____select,
    useMutation: _____useMutation,
  } = updatePost

  export const {
    internal_getRTKQSubscriptions,
    middlewareRegistered,
    onFocus,
    onFocusLost,
    onOffline,
    onOnline,
    queryResultPatched,
    removeMutationResult,
    removeQueryResult,
    resetApiState: _resetApiState,
    subscriptionsUpdated,
    unsubscribeQueryResult,
    updateProvidedBy,
    updateSubscriptionOptions,
  } = internalActions

  export const {
    getRunningMutationThunk,
    getRunningMutationsThunk,
    getRunningQueriesThunk,
    getRunningQueryThunk,
    invalidateTags,
    patchQueryData,
    prefetch,
    resetApiState,
    selectCachedArgsForQuery,
    selectInvalidatedBy,
    updateQueryData,
    upsertQueryData,
  } = util
}

export = postsModule
