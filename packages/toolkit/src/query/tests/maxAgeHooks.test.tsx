import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { act, cleanup, renderHook } from '@testing-library/react'
import * as React from 'react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

describe('maxAge in query hooks', () => {
  const baseQuery = vi.fn((arg: number) => ({ data: arg }))
  const api = createApi({
    baseQuery,
    endpoints: (build) => ({
      getValue: build.query<number, number>({ query: (arg) => arg }),
    }),
  })
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  )

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    baseQuery.mockClear()
  })

  afterEach(() => {
    cleanup()
    store.dispatch(api.util.resetApiState())
    vi.useRealTimers()
  })

  test.each(['useLazyQuery', 'useLazyQuerySubscription'] as const)(
    '%s reuses fresh data and refetches at the maxAge boundary',
    async (hook) => {
      const { result } = renderHook(() => api.endpoints.getValue[hook](), {
        wrapper,
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
        await result.current[0](1, { maxAge: 0, preferCacheValue: true })
      })
      expect(baseQuery).toHaveBeenCalledTimes(3)
    },
  )

  test('keeps boolean lazy-trigger arguments and supports preferCacheValue in an options object', async () => {
    const { result } = renderHook(() => api.endpoints.getValue.useLazyQuery(), {
      wrapper,
    })

    for (const options of [undefined, false, {}]) {
      await act(async () => {
        await result.current[0](1, options)
      })
    }
    expect(baseQuery).toHaveBeenCalledTimes(3)

    for (const options of [true, { preferCacheValue: true }]) {
      await act(async () => {
        await result.current[0](1, options)
      })
    }
    expect(baseQuery).toHaveBeenCalledTimes(3)
  })

  test('usePrefetch accepts maxAge defaults and call-site overrides', async () => {
    const { result } = renderHook(
      () => api.usePrefetch('getValue', { maxAge: 10 }),
      { wrapper },
    )
    const settle = () =>
      Promise.all(store.dispatch(api.util.getRunningQueriesThunk()))

    await act(async () => {
      result.current(1)
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 9999)
    await act(async () => {
      result.current(1)
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1)
    await act(async () => {
      result.current(1)
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(2)

    await act(async () => {
      result.current(1, { maxAge: 0 })
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(3)

    await act(async () => {
      result.current(1, { force: true })
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(4)

    vi.setSystemTime(Date.now() + 1000)
    await act(async () => {
      result.current(1, { ifOlderThan: 0.5 })
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(5)

    await act(async () => {
      result.current(1, { maxAge: 10, ifOlderThan: 0.5 })
      await settle()
    })
    expect(baseQuery).toHaveBeenCalledTimes(5)
  })
})
