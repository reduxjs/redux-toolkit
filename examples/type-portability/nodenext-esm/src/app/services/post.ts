import { apiSlice } from './api.js'
import type { Post } from './posts.js'

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
  useAddPostMutation,
  useDeletePostMutation,
  useGetPostQuery,
  useLazyGetPostQuery,
  usePrefetch,
  useUpdatePostMutation,
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
  RawResultType,
  ReducerPath,
  ResultType,
  TagTypes,
} = Types

export const {
  argSchema,
  catchSchemaFailure,
  errorResponseSchema,
  extraOptions,
  invalidatesTags,
  metaSchema,
  onCacheEntryAdded,
  onQueryStarted,
  onSchemaFailure,
  providesTags,
  query,
  queryFn,
  rawErrorResponseSchema,
  rawResponseSchema,
  responseSchema,
  skipSchemaValidation,
  structuralSharing,
  transformErrorResponse,
  transformResponse,
  type: __type,
  Types: _Types,
} = MutationDefinition

export const { fetched_at, id, name: _name } = QueryArg

export const {
  cacheEntriesUpserted,
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

export const { match, type } = cacheEntriesUpserted

export const { match: _match, type: _type } = updateSubscriptionOptions

export const {
  getRunningMutationsThunk,
  getRunningMutationThunk,
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
  upsertQueryEntries,
} = util

export const { match: __match } = upsertQueryEntries

export const { match: ___match, type: ___type } = invalidateTags
