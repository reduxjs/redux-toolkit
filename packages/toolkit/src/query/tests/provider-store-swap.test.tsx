import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'

let calls: string[] = []

const makeApi = () =>
  createApi({
    baseQuery: async (arg: string) => {
      calls.push(arg)
      return { data: arg }
    },
    endpoints: (build) => ({
      getPost: build.query<string, number>({ query: (id) => `post-${id}` }),
      getPages: build.infiniteQuery<string, string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_l, _a, last) => last + 1,
        },
        query: ({ queryArg, pageParam }) => `${queryArg}-page-${pageParam}`,
      }),
      addPost: build.mutation<string, number>({ query: (id) => `add-${id}` }),
    }),
  })
type TestApi = ReturnType<typeof makeApi>

const makeStore = (api: TestApi) =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })
type Store = ReturnType<typeof makeStore>

const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

beforeEach(() => {
  calls = []
  consoleWarnSpy.mockClear()
})

afterAll(() => {
  consoleWarnSpy.mockRestore()
})

function setup<T>(
  hook: (api: TestApi) => T,
  { strict = false, keyed = true } = {},
) {
  const api = makeApi()
  const storeA = makeStore(api)
  const storeB = makeStore(api)
  const ref = { current: storeA }
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const provider = (
      <Provider
        key={keyed ? (ref.current === storeA ? 'a' : 'b') : undefined}
        store={ref.current}
      >
        {children}
      </Provider>
    )
    return strict ? <React.StrictMode>{provider}</React.StrictMode> : provider
  }
  const utils = renderHook(() => hook(api), { wrapper: Wrapper })
  const swap = (store: Store) => {
    ref.current = store
    utils.rerender()
  }
  const subCount = (store: Store, key: string) =>
    store.dispatch(api.util.getMiddlewareState())?.getSubscriptionCount(key)
  return { ...utils, api, storeA, storeB, swap, subCount }
}

describe.each([false, true])(
  'swapping the store of a keyed Provider (StrictMode: %s)',
  (strict) => {
    test('useQuery fetches once from the new store and unsubscribes from the old one', async () => {
      const { result, api, storeA, storeB, swap, subCount } = setup(
        (api) => api.endpoints.getPost.useQuery(1),
        { strict },
      )
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(calls).toEqual(['post-1'])

      swap(storeB)
      await waitFor(() =>
        expect(api.endpoints.getPost.select(1)(storeB.getState()).status).toBe(
          'fulfilled',
        ),
      )
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(calls).toEqual(['post-1', 'post-1'])
      expect(subCount(storeA, 'getPost(1)')).toBe(0)
      expect(subCount(storeB, 'getPost(1)')).toBe(1)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    test('useLazyQuery starts uninitialized and triggers against the new store', async () => {
      const { result, storeA, storeB, swap, subCount } = setup(
        (api) => api.endpoints.getPost.useLazyQuery(),
        { strict },
      )
      act(() => {
        result.current[0](2)
      })
      await waitFor(() => expect(result.current[1].isSuccess).toBe(true))

      swap(storeB)
      expect(subCount(storeA, 'getPost(2)')).toBe(0)
      expect(result.current[1].isUninitialized).toBe(true)

      act(() => {
        result.current[0](2)
      })
      await waitFor(() => expect(result.current[1].isSuccess).toBe(true))
      expect(subCount(storeB, 'getPost(2)')).toBe(1)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    test('useInfiniteQuery fetches from the new store and fetchNextPage uses it', async () => {
      const { result, storeA, storeB, swap, subCount } = setup(
        (api) => api.endpoints.getPages.useInfiniteQuery('x'),
        { strict },
      )
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      swap(storeB)
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(subCount(storeA, 'getPages("x")')).toBe(0)
      expect(subCount(storeB, 'getPages("x")')).toBe(1)

      await act(async () => {
        await result.current.fetchNextPage()
      })
      await waitFor(() =>
        expect(result.current.data?.pages).toEqual(['x-page-0', 'x-page-1']),
      )
      expect(calls).toEqual(['x-page-0', 'x-page-0', 'x-page-1'])
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  },
)

describe('swapping the store of an unkeyed Provider', () => {
  test.each<[string, (api: TestApi) => unknown]>([
    ['useQuery', (api) => api.endpoints.getPost.useQuery(1)],
    ['useLazyQuery', (api) => api.endpoints.getPost.useLazyQuery()],
    ['useInfiniteQuery', (api) => api.endpoints.getPages.useInfiniteQuery('x')],
    ['useMutation', (api) => api.endpoints.addPost.useMutation()],
  ])('%s warns once in development', (_name, hook) => {
    const { storeA, storeB, swap } = setup(hook, { keyed: false })
    expect(consoleWarnSpy).not.toHaveBeenCalled()

    swap(storeB)
    expect(consoleWarnSpy).toHaveBeenCalledOnce()
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(
      /rendered with a different Redux store[\s\S]*give the Provider a `key`/,
    )

    swap(storeA)
    swap(storeB)
    expect(consoleWarnSpy).toHaveBeenCalledOnce()
  })
})
