import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { vi } from 'vitest'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: () => ({}),
})

describe('injectEndpoints', () => {
  test("query: overridding with `overrideEndpoints`='throw' throws an error", async () => {
    const extended = api.injectEndpoints({
      endpoints: (build) => ({
        injected: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

    expect(() => {
      extended.injectEndpoints({
        overrideExisting: 'throw',
        endpoints: (build) => ({
          injected: build.query<unknown, string>({
            query: () => '/success',
          }),
        }),
      })
    }).toThrowError(
      new Error(
        `called \`injectEndpoints\` to override already-existing endpointName injected without specifying \`overrideExisting: true\``,
      ),
    )
  })

  test('query: overridding an endpoint with `overrideEndpoints`=false does nothing in production', async () => {
    const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    process.env.NODE_ENV = 'development'

    const extended = api.injectEndpoints({
      endpoints: (build) => ({
        injected: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

    extended.injectEndpoints({
      overrideExisting: false,
      endpoints: (build) => ({
        injected: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

    expect(consoleMock).toHaveBeenCalledWith(
      `called \`injectEndpoints\` to override already-existing endpointName injected without specifying \`overrideExisting: true\``,
    )
  })

  test('query: overridding with `overrideEndpoints`=false logs an error in development', async () => {
    const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    process.env.NODE_ENV = 'production'

    const extended = api.injectEndpoints({
      endpoints: (build) => ({
        injected: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

    extended.injectEndpoints({
      overrideExisting: false,
      endpoints: (build) => ({
        injected: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

    expect(consoleMock).not.toHaveBeenCalled()
  })
})
