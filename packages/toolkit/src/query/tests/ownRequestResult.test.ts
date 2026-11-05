import type { Middleware } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import type { QueryCacheKey } from '@reduxjs/toolkit/query'
import { createApi, QueryStatus } from '@reduxjs/toolkit/query'

const createDeferredQueue = () => {
  const resolvers: (() => void)[] = []
  return {
    wait: () => new Promise<void>((resolve) => resolvers.push(resolve)),
    resolveOldest: () => resolvers.shift()?.(),
    get size() {
      return resolvers.length
    },
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const passThrough = (): Middleware => () => (next) => (action) => next(action)

const setup = ({
  before = passThrough(),
  after = passThrough(),
}: { before?: Middleware; after?: Middleware } = {}) => {
  const gate = createDeferredQueue()
  let calls = 0
  const removalReasons: (string | undefined)[] = []
  const api = createApi({
    baseQuery: async () => ({ data: undefined }),
    tagTypes: ['Thing'],
    endpoints: (build) => ({
      getThing: build.query<number, string>({
        queryFn: async () => {
          const call = ++calls
          await gate.wait()
          return { data: call }
        },
        providesTags: ['Thing'],
        async onCacheEntryAdded(
          _arg,
          { cacheEntryRemoved, getCacheEntryRemovedReason },
        ) {
          await cacheEntryRemoved
          removalReasons.push(getCacheEntryRemovedReason())
        },
      }),
    }),
  })
  const makeStore = (preloadedState?: {
    api: ReturnType<typeof api.reducer>
  }) =>
    configureStore({
      reducer: { api: api.reducer },
      preloadedState,
      middleware: (gdm) =>
        gdm({ serializableCheck: false, immutableCheck: false })
          .prepend(before)
          .concat(api.middleware, after),
    })
  return {
    api,
    gate,
    makeStore,
    store: makeStore(),
    removalReasons,
    getCalls: () => calls,
  }
}

describe('initiate() resolves with its own request result', () => {
  test.each(['before', 'after'] as const)(
    'a forced refetch started from a middleware %s the api middleware on fulfilled starts a new request',
    async (position) => {
      let restart: (() => void) | undefined
      const restartOnFirstFulfilled: Middleware = () => (next) => (action) => {
        const result = next(action)
        if (api.endpoints.getThing.matchFulfilled(action) && restart) {
          const run = restart
          restart = undefined
          run()
        }
        return result
      }
      const { api, gate, store, getCalls } = setup({
        [position]: restartOnFirstFulfilled,
      })

      const first = store.dispatch(api.endpoints.getThing.initiate('a'))
      let second: typeof first | undefined
      restart = () => {
        second = store.dispatch(
          api.endpoints.getThing.initiate('a', { forceRefetch: true }),
        )
      }
      gate.resolveOldest()

      await first
      expect(getCalls()).toBe(2)
      expect(store.getState().api.queries[first.queryCacheKey]?.status).toBe(
        QueryStatus.pending,
      )
      // A middleware after the api middleware runs before the api middleware
      // captures the result, so the first promise sees the newer request
      if (position === 'before') {
        await expect(first).resolves.toMatchObject({
          data: 1,
          status: QueryStatus.fulfilled,
        })
      }

      gate.resolveOldest()
      await expect(second).resolves.toMatchObject({ data: 2 })
    },
  )

  test('removing a running entry settles its promise with an AbortError, and a new request resolves on its own', async () => {
    const { api, gate, store, removalReasons } = setup()

    const first = store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: first.queryCacheKey as QueryCacheKey,
      }),
    )
    const second = store.dispatch(api.endpoints.getThing.initiate('a'))

    await expect(first).resolves.toMatchObject({
      isError: true,
      status: QueryStatus.rejected,
      error: { name: 'AbortError', message: 'removed' },
    })
    await expect(first.unwrap()).rejects.toMatchObject({
      name: 'AbortError',
      message: 'removed',
    })

    gate.resolveOldest()
    gate.resolveOldest()
    await expect(second.unwrap()).resolves.toBe(2)
    expect(removalReasons).toEqual(['removed'])
  })

  test('resetApiState settles running promises with reason "reset"', async () => {
    const { api, store, removalReasons } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(api.util.resetApiState())

    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'reset' },
    })
    await settle()
    expect(removalReasons).toEqual(['reset'])
  })

  test('a user abort still rejects with the thunk abort error', async () => {
    const { api, store } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    promise.abort()

    await expect(promise.unwrap()).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Aborted',
    })
  })
})

describe('joining a running request', () => {
  test('refetch while a request is pending joins it', async () => {
    const { api, gate, store, getCalls } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    const refetched = promise.refetch()
    gate.resolveOldest()

    await expect(refetched.unwrap()).resolves.toBe(1)
    await expect(promise.unwrap()).resolves.toBe(1)
    expect(getCalls()).toBe(1)
  })

  test('initiate joins a running upsertQueryData request', async () => {
    const { api, store, getCalls } = setup()

    const upsert = store.dispatch(api.util.upsertQueryData('getThing', 'a', 42))
    const joined = store.dispatch(api.endpoints.getThing.initiate('a'))

    await upsert
    await expect(joined).resolves.toMatchObject({
      data: 42,
      status: QueryStatus.fulfilled,
    })
    expect(getCalls()).toBe(0)
  })

  test('a pending entry restored from state fetches when the middleware is installed', async () => {
    const { api, gate, store, makeStore, getCalls } = setup()

    store.dispatch(api.endpoints.getThing.initiate('a'))
    const restored = makeStore({ api: store.getState().api })
    expect(restored.getState().api.queries['getThing("a")']?.status).toBe(
      QueryStatus.pending,
    )

    const promise = restored.dispatch(api.endpoints.getThing.initiate('a'))
    expect(getCalls()).toBe(2)

    gate.resolveOldest()
    gate.resolveOldest()
    await expect(promise.unwrap()).resolves.toBe(2)
  })
})

describe('invalidating a pending entry', () => {
  test('an unsubscribed entry is removed after its request settles, and the promise keeps its result', async () => {
    const { api, gate, store, getCalls, removalReasons } = setup()

    const promise = store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    store.dispatch(api.util.invalidateTags(['Thing']))
    expect(store.getState().api.queries[promise.queryCacheKey]?.status).toBe(
      QueryStatus.pending,
    )

    gate.resolveOldest()
    await expect(promise.unwrap()).resolves.toBe(1)
    expect(store.getState().api.queries[promise.queryCacheKey]).toBeUndefined()
    expect(getCalls()).toBe(1)
    await settle()
    expect(removalReasons).toEqual(['removed'])
  })

  test('a subscribed entry refetches after its request settles', async () => {
    const { api, gate, store, getCalls } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(api.util.invalidateTags(['Thing']))
    expect(getCalls()).toBe(1)

    gate.resolveOldest()
    await expect(promise.unwrap()).resolves.toBe(1)
    expect(getCalls()).toBe(2)

    gate.resolveOldest()
    await settle()
    expect(store.getState().api.queries[promise.queryCacheKey]?.data).toBe(2)
  })
})
