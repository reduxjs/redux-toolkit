import { configureStore } from '@reduxjs/toolkit'
import {
  createApi,
  fetchBaseQuery,
  skipToken,
} from '@reduxjs/toolkit/query/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import * as React from 'react'
import { Provider } from 'react-redux'

import { server } from '@internal/query/tests/mocks/server'
import { getSubscriptionSelectors } from '@internal/tests/utils/helpers'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<{ id: number; name: string }, number>({
      query: (id) => `/post/${id}`,
    }),
  }),
})

function makeStore() {
  return configureStore({
    reducer: { api: api.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })
}

describe('query hooks after a Provider store swap (issue #5540)', () => {
  test('useQuery subscribes against the new store after a swap', async () => {
    server.use(
      http.get('https://example.com/post/21', () =>
        HttpResponse.json({ id: 21, name: 'post-21' }),
      ),
    )

    const storeA = makeStore()
    const storeB = makeStore()
    let currentStore = storeA

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useQuery(21),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    currentStore = storeB
    rerender()

    // Bug: hook stays pending and no request reaches storeB
    await waitFor(() => expect(result.current.isSuccess).toBe(true), {
      timeout: 3000,
    })
    expect(api.endpoints.getPost.select(21)(storeB.getState())?.status).toBe(
      'fulfilled',
    )
  })

  test('useLazyQuery re-runs the last trigger against the new store after a swap', async () => {
    server.use(
      http.get('https://example.com/post/22', () =>
        HttpResponse.json({ id: 22, name: 'post-22' }),
      ),
    )

    const storeA = makeStore()
    const storeB = makeStore()
    let currentStore = storeA

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useLazyQuery(),
      { wrapper: Wrapper },
    )

    const [trigger] = result.current
    trigger(22)
    await waitFor(() => expect(result.current[1].isSuccess).toBe(true))

    currentStore = storeB
    rerender()

    await waitFor(() => expect(result.current[1].isSuccess).toBe(true), {
      timeout: 3000,
    })
    expect(api.endpoints.getPost.select(22)(storeB.getState())?.status).toBe(
      'fulfilled',
    )
  })
})

let calls: string[] = []

const countingApi = createApi({
  baseQuery: async (arg: string) => {
    calls.push(arg)
    return { data: arg }
  },
  endpoints: (build) => ({
    getPost: build.query<string, number>({
      query: (id) => `post-${id}`,
    }),
    getPages: build.infiniteQuery<string, string, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (_l, _a, last) => last + 1,
      },
      query: ({ queryArg, pageParam }) => `${queryArg}-page-${pageParam}`,
    }),
  }),
})

function makeCountingStore() {
  return configureStore({
    reducer: { api: countingApi.reducer },
    middleware: (gdm) => gdm().concat(countingApi.middleware),
  })
}
type CountingStore = ReturnType<typeof makeCountingStore>

function setup<T>(hook: () => T, strict = false) {
  const storeA = makeCountingStore()
  const storeB = makeCountingStore()
  const ref = { current: storeA as CountingStore }
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const p = <Provider store={ref.current}>{children}</Provider>
    return strict ? <React.StrictMode>{p}</React.StrictMode> : p
  }
  const r = renderHook(hook, { wrapper: Wrapper })
  const swap = (s: CountingStore) => {
    ref.current = s
    r.rerender()
  }
  return { ...r, storeA, storeB, swap }
}

const subCount = (store: CountingStore, key: string) =>
  getSubscriptionSelectors(countingApi, store.dispatch).getSubscriptionCount(
    key,
  )

beforeEach(() => {
  calls = []
})

describe.each([false, true])(
  'store swap cleanup and refetch counts (StrictMode: %s)',
  (strict) => {
    test('useQuery: one fetch on new store, old store unsubscribed', async () => {
      const { result, storeA, storeB, swap } = setup(
        () => countingApi.endpoints.getPost.useQuery(1),
        strict,
      )
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(calls).toEqual(['post-1'])
      expect(subCount(storeA, 'getPost(1)')).toBe(1)

      swap(storeB)
      await waitFor(() =>
        expect(
          countingApi.endpoints.getPost.select(1)(storeB.getState()).status,
        ).toBe('fulfilled'),
      )
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual(['post-1', 'post-1'])
      expect(subCount(storeA, 'getPost(1)')).toBe(0)
      expect(subCount(storeB, 'getPost(1)')).toBe(1)

      // swap back: storeA still has cached data (keepUnusedDataFor 60s)
      swap(storeA)
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual(['post-1', 'post-1'])
      expect(subCount(storeA, 'getPost(1)')).toBe(1)
      expect(subCount(storeB, 'getPost(1)')).toBe(0)
      expect(result.current.data).toBe('post-1')
    })

    test('useQuery with skip: no fetch on new store', async () => {
      const { result, storeA, storeB, swap } = setup(
        () => countingApi.endpoints.getPost.useQuery(skipToken),
        strict,
      )
      swap(storeB)
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual([])
      expect(result.current.isUninitialized).toBe(true)
      expect(subCount(storeA, 'getPost(1)')).toBe(0)
    })

    test('useLazyQuery: before trigger no fetch, after trigger refetch on new store', async () => {
      const { result, storeA, storeB, swap } = setup(
        () => countingApi.endpoints.getPost.useLazyQuery(),
        strict,
      )
      const other = makeCountingStore()
      swap(other)
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual([])

      swap(storeA)
      act(() => {
        result.current[0](2)
      })
      await waitFor(() => expect(result.current[1].isSuccess).toBe(true))
      expect(calls).toEqual(['post-2'])
      swap(storeB)
      await waitFor(() =>
        expect(
          countingApi.endpoints.getPost.select(2)(storeB.getState()).status,
        ).toBe('fulfilled'),
      )
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual(['post-2', 'post-2'])
      expect(subCount(storeA, 'getPost(2)')).toBe(0)
      expect(subCount(storeB, 'getPost(2)')).toBe(1)
    })

    test('useInfiniteQuery: fetches on new store, old store unsubscribed', async () => {
      const { result, storeA, storeB, swap } = setup(
        () => countingApi.endpoints.getPages.useInfiniteQuery('a'),
        strict,
      )
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(calls).toEqual(['a-page-0'])
      swap(storeB)
      await waitFor(() =>
        expect(
          countingApi.endpoints.getPages.select('a')(storeB.getState()).status,
        ).toBe('fulfilled'),
      )
      await act(() => new Promise((r) => setTimeout(r, 20)))
      expect(calls).toEqual(['a-page-0', 'a-page-0'])
      expect(subCount(storeA, 'getPages("a")')).toBe(0)
      expect(subCount(storeB, 'getPages("a")')).toBe(1)

      await act(async () => {
        await result.current.fetchNextPage()
      })
      expect(calls).toEqual(['a-page-0', 'a-page-0', 'a-page-1'])
      expect(
        countingApi.endpoints.getPages.select('a')(storeB.getState()).data
          ?.pages,
      ).toEqual(['a-page-0', 'a-page-1'])
    })
  },
)
