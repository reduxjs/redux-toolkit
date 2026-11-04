import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

const createTestApi = () => {
  const resolvers: (() => void)[] = []
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getValue: build.query<number, number>({
        queryFn: async (arg) => {
          await new Promise<void>((resolve) => resolvers.push(resolve))
          return { data: arg }
        },
      }),
      setValue: build.mutation<number, number>({
        queryFn: async (arg) => {
          await new Promise<void>((resolve) => resolvers.push(resolve))
          return { data: arg }
        },
      }),
    }),
  })
  const resolveAll = () => resolvers.splice(0).forEach((resolve) => resolve())
  return { api, resolveAll }
}

const createStore = (api: ReturnType<typeof createTestApi>['api']) =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })

describe('per-store runtime', () => {
  test('running queries and mutations are tracked per store', async () => {
    const { api, resolveAll } = createTestApi()
    const storeA = createStore(api)
    const storeB = createStore(api)

    const queryPromise = storeA.dispatch(api.endpoints.getValue.initiate(1))
    const mutationPromise = storeA.dispatch(api.endpoints.setValue.initiate(1))

    expect(storeA.dispatch(api.util.getRunningQueriesThunk())).toEqual([
      queryPromise,
    ])
    expect(storeA.dispatch(api.util.getRunningMutationsThunk())).toEqual([
      mutationPromise,
    ])
    expect(storeB.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    expect(storeB.dispatch(api.util.getRunningMutationsThunk())).toEqual([])

    resolveAll()
    await queryPromise
    await mutationPromise

    expect(storeA.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    expect(storeA.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
  })

  test('lifecycles receive the thunk extra argument of their own store', async () => {
    const seen: unknown[] = []
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getValue: build.query<number, number>({
          queryFn: (arg) => ({ data: arg }),
          onQueryStarted: (_, { extra }) => {
            seen.push(extra)
          },
          onCacheEntryAdded: (_, { extra }) => {
            seen.push(extra)
          },
        }),
      }),
    })
    const createStoreWithExtra = (extraArgument: string) =>
      configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (gdm) =>
          gdm({ thunk: { extraArgument } }).concat(api.middleware),
      })
    const storeA = createStoreWithExtra('a')
    const storeB = createStoreWithExtra('b')

    await storeA.dispatch(api.endpoints.getValue.initiate(1))
    await storeB.dispatch(api.endpoints.getValue.initiate(1))
    await storeA.dispatch(api.endpoints.getValue.initiate(2))

    expect(seen).toEqual(['a', 'a', 'b', 'b', 'a', 'a'])
  })

  test('resetApiState clears the timers and cache lifecycles of its own store only', async () => {
    vi.useFakeTimers()
    try {
      const removed: string[] = []
      const api = createApi({
        baseQuery: fakeBaseQuery(),
        endpoints: (build) => ({
          getValue: build.query<number, number>({
            queryFn: (arg) => ({ data: arg }),
            onCacheEntryAdded: async (arg, { cacheEntryRemoved, extra }) => {
              await cacheEntryRemoved
              removed.push(`${extra}-${arg}`)
            },
          }),
        }),
      })
      const createStoreWithExtra = (extraArgument: string) =>
        configureStore({
          reducer: { [api.reducerPath]: api.reducer },
          middleware: (gdm) =>
            gdm({ thunk: { extraArgument } }).concat(api.middleware),
          enhancers: (gde) => gde({ autoBatch: false }),
        })
      const getSubscriptions = (
        store: ReturnType<typeof createStoreWithExtra>,
      ) =>
        (
          store.dispatch(
            api.internalActions.internal_getRTKQSubscriptions(),
          ) as unknown as SubscriptionSelectors
        ).getSubscriptions()

      const storeA = createStoreWithExtra('a')
      const storeB = createStoreWithExtra('b')

      const startQueries = async (
        store: ReturnType<typeof createStoreWithExtra>,
      ) => {
        // polling timer for key 1, cache collection timer for key 2
        await store.dispatch(
          api.endpoints.getValue.initiate(1, {
            subscriptionOptions: { pollingInterval: 1000 },
          }),
        )
        const unused = store.dispatch(api.endpoints.getValue.initiate(2))
        await unused
        unused.unsubscribe()
      }

      await startQueries(storeA)
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      storeA.dispatch(api.util.resetApiState())
      await vi.advanceTimersByTimeAsync(0)

      expect(vi.getTimerCount()).toBe(0)
      expect(removed).toEqual(['a-1', 'a-2'])
      expect(getSubscriptions(storeA).size).toBe(0)

      await startQueries(storeB)
      await startQueries(storeA)
      storeA.dispatch(api.util.resetApiState())
      await vi.advanceTimersByTimeAsync(0)

      expect(removed).toEqual(['a-1', 'a-2', 'a-1', 'a-2'])
      expect(getSubscriptions(storeA).size).toBe(0)
      expect(getSubscriptions(storeB).get('getValue(1)')?.size).toBe(1)
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })

  test('a store without the middleware does not track running requests', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const { api } = createTestApi()
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
      })

      store.dispatch(api.endpoints.getValue.initiate(1))
      store.dispatch(api.endpoints.setValue.initiate(1))

      expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
      expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
    } finally {
      vi.unstubAllEnvs()
    }
  })

  test('an abort listener can restart a query that resetApiState aborted', async () => {
    let calls = 0
    let restarted: Promise<unknown> | undefined
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getValue: build.query<number, number>({
          queryFn: (arg, { signal, dispatch }) => {
            calls++
            if (calls === 1) {
              signal.addEventListener('abort', () => {
                restarted = dispatch(api.endpoints.getValue.initiate(arg))
              })
            }
            return new Promise((resolve) => {
              if (calls > 1) resolve({ data: arg })
            })
          },
        }),
      }),
    })
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    })

    store.dispatch(api.endpoints.getValue.initiate(1))
    await vi.waitFor(() => expect(calls).toBe(1))
    store.dispatch(api.util.resetApiState())

    const result = await restarted
    expect(calls).toBe(2)
    expect(result).toMatchObject({ status: 'fulfilled', data: 1 })
  })
})
