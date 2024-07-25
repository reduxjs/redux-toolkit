import {
  createApi,
  fakeBaseQuery,
  fetchBaseQuery,
  retry,
} from '@reduxjs/toolkit/query/react'
import type { RootState } from '../store'

export const baseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    const { token } = (getState() as RootState).auth

    if (token) {
      headers.set('authentication', `Bearer ${token}`)
    }

    return headers
  },
})

export const baseQueryWithRetry = retry(baseQuery, { maxRetries: 6 })

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Time', 'Posts', 'Counter'],
  endpoints: () => ({}),
})

export const enhancedApi = apiSlice.enhanceEndpoints({
  endpoints: () => ({
    getPost: () => 'test',
  }),
})

export const emptyApi = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: () => ({}),
})

export const {
  endpoints: _endpoints,
  enhanceEndpoints: _enhanceEndpoints,
  injectEndpoints: _injectEndpoints,
  internalActions: _internalActions,
  middleware: _middleware,
  reducer: _reducer,
  reducerPath: _reducerPath,
  usePrefetch: _usePrefetch,
  util: _util,
} = apiSlice

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
} = enhancedApi

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
