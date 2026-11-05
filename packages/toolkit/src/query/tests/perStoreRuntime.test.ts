import type { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { QueryCacheKey } from '../core/apiState'
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

describe('records and nested dispatches', () => {
  const createStoreWithReaction = (
    api: ReturnType<typeof createTestApi>['api'],
    react: (
      action: unknown,
      dispatch: ThunkDispatch<unknown, unknown, UnknownAction>,
    ) => void,
  ) => {
    const reaction: Middleware = (mwApi) => (next) => (action) => {
      const result = next(action)
      react(action, mwApi.dispatch)
      return result
    }
    return configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware, reaction),
    })
  }

  test('a request started while an older pending is dispatched stays registered', async () => {
    const { api, resolveAll } = createTestApi()
    let restarted:
      | ReturnType<ReturnType<typeof api.endpoints.getValue.initiate>>
      | undefined
    let reacted = false
    const store = createStoreWithReaction(api, (action, dispatch) => {
      if (!reacted && api.endpoints.getValue.matchPending(action)) {
        reacted = true
        dispatch(api.util.resetApiState())
        restarted = dispatch(api.endpoints.getValue.initiate(1))
      }
    })

    const outer = store.dispatch(api.endpoints.getValue.initiate(1))

    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([
      restarted,
    ])
    await expect(outer).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'reset' },
    })
    resolveAll()
    await expect(restarted).resolves.toMatchObject({
      status: 'fulfilled',
      data: 1,
    })
  })

  test('a subscription added while the entry is removed is kept', async () => {
    const { api, resolveAll } = createTestApi()
    let resubscribed:
      | ReturnType<ReturnType<typeof api.endpoints.getValue.initiate>>
      | undefined
    const store = createStoreWithReaction(api, (action, dispatch) => {
      if (
        !resubscribed &&
        api.internalActions.removeQueryResult.match(action)
      ) {
        resubscribed = dispatch(api.endpoints.getValue.initiate(1))
      }
    })

    const first = store.dispatch(api.endpoints.getValue.initiate(1))
    resolveAll()
    await first
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: first.queryCacheKey as QueryCacheKey,
      }),
    )

    expect(resubscribed?.isSubscribed()).toBe(true)
    resolveAll()
    await resubscribed
    expect(resubscribed?.isSubscribed()).toBe(true)
  })

  test('a request started while a running entry is removed keeps running', async () => {
    const { api, resolveAll } = createTestApi()
    let restarted:
      | ReturnType<ReturnType<typeof api.endpoints.getValue.initiate>>
      | undefined
    const store = createStoreWithReaction(api, (action, dispatch) => {
      if (!restarted && api.internalActions.removeQueryResult.match(action)) {
        restarted = dispatch(api.endpoints.getValue.initiate(1))
      }
    })

    const first = store.dispatch(api.endpoints.getValue.initiate(1))
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: first.queryCacheKey as QueryCacheKey,
      }),
    )

    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([
      restarted,
    ])
    resolveAll()
    await expect(first).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'removed' },
    })
    await expect(restarted).resolves.toMatchObject({ data: 1 })
    expect(restarted?.isSubscribed()).toBe(true)
  })

  test('a forced request while another runs joins it, even after the entry was overwritten', async () => {
    const resolvers: (() => void)[] = []
    const seen: unknown[] = []
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getValue: build.query<number, number>({
          queryFn: async (arg) => {
            await new Promise<void>((resolve) => resolvers.push(resolve))
            return { data: arg }
          },
          onQueryStarted: (arg, { dispatch }) => {
            seen.push(dispatch(api.util.getRunningQueryThunk('getValue', arg)))
          },
        }),
      }),
    })
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    })

    const first = store.dispatch(api.endpoints.getValue.initiate(1))
    store.dispatch(
      api.util.upsertQueryEntries([
        { endpointName: 'getValue', arg: 1, value: 5 },
      ]),
    )
    const second = store.dispatch(
      api.endpoints.getValue.initiate(1, { forceRefetch: true }),
    )

    expect(seen).toEqual([undefined])
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([first])
    resolvers.splice(0).forEach((resolve) => resolve())
    await Promise.all([first, second])
  })
})
