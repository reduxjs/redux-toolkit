import { apiSlice } from './api.js'

export interface TimeResponse {
  time: string
}

export const timeApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getTime: build.query<TimeResponse, string>({
      query: (id) => `time/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Time', id }],
    }),
  }),
})

export const {
  useLazyGetTimeQuery,
  usePrefetch: usePrefetchTime,
  useGetTimeQuery,
  endpoints,
  enhanceEndpoints,
  injectEndpoints,
  internalActions,
  middleware,
  reducer,
  reducerPath,
  util,
} = timeApi

export const { getTime } = endpoints

export const {
  Types,
  initiate,
  matchFulfilled,
  matchPending,
  matchRejected,
  name,
  select,
  useQuery,
  useLazyQuery,
  useQuerySubscription,
  useQueryState,
  useLazyQuerySubscription,
} = getTime

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
