import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: () => ({}),
})

describe('type tests', () => {
  test(`mutation: onStart and onSuccess`, async () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.mutation<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            // awaiting without catching like this would result in an `unhandledRejection` exception if there was an error
            // unfortunately we cannot test for that in jest.
            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })

  test('query types', () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.query<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            queryFulfilled.then(
              (result) => {
                expectTypeOf(result).toMatchTypeOf<{
                  data: number
                  meta?: FetchBaseQueryMeta
                }>()
              },
              (reason) => {
                if (reason.isUnhandledError) {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: unknown
                    meta?: undefined
                    isUnhandledError: true
                  }>()
                } else {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: FetchBaseQueryError
                    isUnhandledError: false
                    meta: FetchBaseQueryMeta | undefined
                  }>()
                }
              },
            )

            queryFulfilled.catch((reason) => {
              if (reason.isUnhandledError) {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: unknown
                  meta?: undefined
                  isUnhandledError: true
                }>()
              } else {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: FetchBaseQueryError
                  isUnhandledError: false
                  meta: FetchBaseQueryMeta | undefined
                }>()
              }
            })

            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })

  test('mutation types', () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.query<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            queryFulfilled.then(
              (result) => {
                expectTypeOf(result).toMatchTypeOf<{
                  data: number
                  meta?: FetchBaseQueryMeta
                }>()
              },
              (reason) => {
                if (reason.isUnhandledError) {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: unknown
                    meta?: undefined
                    isUnhandledError: true
                  }>()
                } else {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: FetchBaseQueryError
                    isUnhandledError: false
                    meta: FetchBaseQueryMeta | undefined
                  }>()
                }
              },
            )

            queryFulfilled.catch((reason) => {
              if (reason.isUnhandledError) {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: unknown
                  meta?: undefined
                  isUnhandledError: true
                }>()
              } else {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: FetchBaseQueryError
                  isUnhandledError: false
                  meta: FetchBaseQueryMeta | undefined
                }>()
              }
            })

            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })
})
