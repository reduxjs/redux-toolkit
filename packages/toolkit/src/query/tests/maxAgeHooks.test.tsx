import { setupApiStore } from '@internal/tests/utils/helpers'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { PrefetchOptions } from '@reduxjs/toolkit/query/react'
import { act, renderHook } from '@testing-library/react'

describe('maxAge in query hooks', () => {
  const baseQuery = vi.fn((arg: number) => ({ data: arg }))
  const api = createApi({
    baseQuery,
    endpoints: (build) => ({
      getValue: build.query<number, number>({ query: (arg) => arg }),
    }),
  })
  const storeRef = setupApiStore(api, undefined, { withoutListeners: true })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    baseQuery.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test.each(['useLazyQuery', 'useLazyQuerySubscription'] as const)(
    '%s reuses fresh data and refetches at the maxAge boundary',
    async (hook) => {
      const { result } = renderHook(() => api.endpoints.getValue[hook](), {
        wrapper: storeRef.wrapper,
      })

      await act(async () => {
        await result.current[0](1, { maxAge: 10 })
      })
      expect(baseQuery).toHaveBeenCalledTimes(1)

      vi.setSystemTime(Date.now() + 9999)
      await act(async () => {
        await result.current[0](1, { maxAge: 10 })
      })
      expect(baseQuery).toHaveBeenCalledTimes(1)

      vi.setSystemTime(Date.now() + 1)
      await act(async () => {
        await result.current[0](1, { maxAge: 10 })
      })
      expect(baseQuery).toHaveBeenCalledTimes(2)

      await act(async () => {
        await result.current[0](1, { maxAge: 0 })
      })
      expect(baseQuery).toHaveBeenCalledTimes(3)
    },
  )

  test('keeps boolean lazy-trigger arguments', async () => {
    const { result } = renderHook(() => api.endpoints.getValue.useLazyQuery(), {
      wrapper: storeRef.wrapper,
    })

    for (const options of [undefined, false]) {
      await act(async () => {
        await result.current[0](1, options)
      })
    }
    expect(baseQuery).toHaveBeenCalledTimes(2)

    await act(async () => {
      await result.current[0](1, true)
    })
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('usePrefetch accepts maxAge defaults and call-site overrides', async () => {
    const { result } = renderHook(
      () => api.usePrefetch('getValue', { maxAge: 10 }),
      { wrapper: storeRef.wrapper },
    )
    const prefetch = (options?: PrefetchOptions) =>
      act(async () => {
        result.current(1, options)
        await Promise.all(
          storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
        )
      })

    await prefetch()
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 9999)
    await prefetch()
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1)
    await prefetch()
    expect(baseQuery).toHaveBeenCalledTimes(2)

    await prefetch({ maxAge: 0 })
    expect(baseQuery).toHaveBeenCalledTimes(3)

    await prefetch({ force: true })
    expect(baseQuery).toHaveBeenCalledTimes(4)

    vi.setSystemTime(Date.now() + 1000)
    await prefetch({ ifOlderThan: 0.5 })
    expect(baseQuery).toHaveBeenCalledTimes(5)

    await prefetch({ maxAge: 10, ifOlderThan: 0.5 })
    expect(baseQuery).toHaveBeenCalledTimes(5)
  })
})
