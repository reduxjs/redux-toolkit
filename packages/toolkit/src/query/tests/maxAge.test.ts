import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query'
import type { PrefetchOptions } from '../core/module'
import type { StartQueryActionCreatorOptions } from '../core/buildInitiate'

describe('call-site maxAge', () => {
  const baseQuery = vi.fn((arg: number) => ({ data: arg }))
  const api = createApi({
    baseQuery,
    refetchOnMountOrArgChange: true,
    endpoints: (build) => ({
      getValue: build.query<number, number>({ query: (arg) => arg }),
    }),
  })
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  })
  const initiate = (options?: StartQueryActionCreatorOptions) =>
    store.dispatch(api.endpoints.getValue.initiate(1, options))
  const prefetch = async (options?: PrefetchOptions) => {
    store.dispatch(api.util.prefetch('getValue', 1, options))
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    baseQuery.mockClear()
  })

  afterEach(() => {
    store.dispatch(api.util.resetApiState())
    vi.useRealTimers()
  })

  test.each(['initiate', 'prefetch'] as const)(
    '%s fetches missing data, reuses fresh data, and refetches at the exact age boundary',
    async (method) => {
      const fetch = method === 'initiate' ? initiate : prefetch

      await fetch({ maxAge: 10 })
      expect(baseQuery).toHaveBeenCalledTimes(1)

      vi.setSystemTime(Date.now() + 9999)
      await fetch({ maxAge: 10 })
      expect(baseQuery).toHaveBeenCalledTimes(1)

      vi.setSystemTime(Date.now() + 1)
      await fetch({ maxAge: 10 })
      expect(baseQuery).toHaveBeenCalledTimes(2)
    },
  )

  test.each(['initiate', 'prefetch'] as const)(
    '%s always refetches with maxAge: 0',
    async (method) => {
      const fetch = method === 'initiate' ? initiate : prefetch

      await fetch({ maxAge: 0 })
      await fetch({ maxAge: 0 })
      expect(baseQuery).toHaveBeenCalledTimes(2)
    },
  )

  test('maxAge takes precedence over numeric forceRefetch', async () => {
    await initiate()
    vi.setSystemTime(Date.now() + 1000)

    await initiate({ maxAge: 10, forceRefetch: 0.5 })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    await initiate({ maxAge: 0, forceRefetch: 10 })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('forceRefetch: true takes precedence over maxAge', async () => {
    await initiate()
    await initiate({ maxAge: 10, forceRefetch: true })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('numeric forceRefetch keeps its existing behavior', async () => {
    await initiate()
    await initiate({ forceRefetch: 0 })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1000)
    await initiate({ forceRefetch: 1 })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('maxAge takes precedence over ifOlderThan', async () => {
    await prefetch()
    vi.setSystemTime(Date.now() + 1000)

    await prefetch({ maxAge: 10, ifOlderThan: 0.5 })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    await prefetch({ maxAge: 0, ifOlderThan: 10 })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('force: true takes precedence over maxAge', async () => {
    await prefetch()
    await prefetch({ maxAge: 10, force: true })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('ifOlderThan keeps its existing behavior', async () => {
    await prefetch()
    await prefetch({ ifOlderThan: false })
    await prefetch({ ifOlderThan: 0 })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1000)
    await prefetch({ ifOlderThan: 1 })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })
})
