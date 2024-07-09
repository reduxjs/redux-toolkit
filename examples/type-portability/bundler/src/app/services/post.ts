import { apiSlice } from './api'
import type { Post } from './posts'

export const postApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        }
      },
      invalidatesTags: ['Posts'],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Posts', id }],
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
  }),
})

export const {
  endpoints,
  enhanceEndpoints,
  injectEndpoints,
  internalActions,
  middleware,
  reducer,
  reducerPath,
  usePrefetch,
  util,
} = postApi

export const { addPost, deletePost, getPost, updatePost } = endpoints

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
  BaseQuery,
  MutationDefinition,
  QueryArg,
  ReducerPath,
  ResultType,
  TagTypes,
} = Types

export const {
  type: __type,
  Types: _Types,
  extraOptions,
  invalidatesTags,
  onCacheEntryAdded,
  onQueryStarted,
  providesTags,
  query,
  queryFn,
  structuralSharing,
  transformErrorResponse,
  transformResponse,
} = MutationDefinition

export const { fetched_at, id, name: _name } = QueryArg

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

export const { match, type } = updateSubscriptionOptions

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

export const { match: _match, type: _type } = invalidateTags
