import { apiSlice } from './api.js'

export interface CountResponse {
  count: number
}

export const counterApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCount: build.query<CountResponse, void>({
      query: () => 'count',
      providesTags: ['Counter'],
    }),
    incrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `increment`,
          method: 'PUT',
          body: { amount },
        }
      },
      invalidatesTags: ['Counter'],
    }),
    decrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `decrement`,
          method: 'PUT',
          body: { amount },
        }
      },
      invalidatesTags: ['Counter'],
    }),
  }),
})

export const {
  useDecrementCountMutation,
  useGetCountQuery,
  useIncrementCountMutation,
  useLazyGetCountQuery,
  endpoints,
  enhanceEndpoints,
  injectEndpoints,
  internalActions,
  middleware,
  reducer,
  reducerPath,
  usePrefetch,
  util,
} = counterApi

export const { decrementCount, getCount, incrementCount } = endpoints

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

export const { match: __match, type: __type } = invalidateTags

export const { match: ___match } = upsertQueryEntries
