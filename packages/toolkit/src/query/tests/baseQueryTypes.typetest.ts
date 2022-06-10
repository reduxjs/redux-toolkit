import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query'

/**
 * Test: BaseQuery propagates meta types to its callbacks
 */
{
  createApi({
    baseQuery: fetchBaseQuery(),
    endpoints: (build) => ({
      getDummy: build.query<null, undefined>({
        query: () => 'dummy',
        onCacheEntryAdded: async (arg, { cacheDataLoaded }) => {
          const { meta } = await cacheDataLoaded
          const { request, response } = meta! // We expect request and response to be there
        },
      }),
    }),
  })

  const baseQuery = retry(fetchBaseQuery()) // Expect meta type even when wrapped with retry
  createApi({
    baseQuery,
    endpoints: (build) => ({
      getDummy: build.query<null, undefined>({
        query: () => 'dummy',
        onCacheEntryAdded: async (arg, { cacheDataLoaded }) => {
          const { meta } = await cacheDataLoaded
          const { request, response } = meta!
        },
      }),
    }),
  })
}
