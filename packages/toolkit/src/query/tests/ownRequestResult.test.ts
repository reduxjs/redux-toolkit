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
  refetchOnFocus = false,
  invalidationBehavior = 'delayed',
  onAbort,
}: {
  before?: Middleware
  after?: Middleware
  refetchOnFocus?: boolean
  invalidationBehavior?: 'delayed' | 'immediately'
  onAbort?: (arg: string) => void
} = {}) => {
  const gate = createDeferredQueue()
  let calls = 0
  const removalReasons: (string | undefined)[] = []
  const aborted: string[] = []
  const api = createApi({
    baseQuery: async () => ({ data: undefined }),
    tagTypes: ['Thing'],
    refetchOnFocus,
    invalidationBehavior,
    endpoints: (build) => ({
      getThing: build.query<number, string>({
        queryFn: async (arg, { signal }) => {
          signal.addEventListener('abort', () => {
            aborted.push(arg)
            onAbort?.(arg)
          })
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
    aborted,
    getCalls: () => calls,
  }
}

describe('initiate() resolves with its own request result', () => {
  test.each(['before', 'after'] as const)(
    'a forced refetch started from a middleware %s the api middleware on fulfilled starts a new request',
    async (position) => {
      let onAction: ((action: unknown) => void) | undefined
      const callOnAction: Middleware = () => (next) => (action) => {
        const result = next(action)
        onAction?.(action)
        return result
      }
      const { api, gate, store, getCalls } = setup({
        [position]: callOnAction,
      })

      const first = store.dispatch(api.endpoints.getThing.initiate('a'))
      let second: typeof first | undefined
      onAction = (action) => {
        if (!api.endpoints.getThing.matchFulfilled(action)) return
        onAction = undefined
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
      // Known limitation: a middleware after the api middleware runs before the
      // api middleware captures the result, so the first promise sees the newer
      // request's pending state (with the data the first request wrote)
      await expect(first).resolves.toMatchObject({
        data: 1,
        status:
          position === 'before' ? QueryStatus.fulfilled : QueryStatus.pending,
      })

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

  test('removing an entry while its fulfilled is being dispatched settles the promise with an AbortError', async () => {
    let onAction: ((action: unknown) => void) | undefined
    const callOnAction: Middleware = () => (next) => (action) => {
      onAction?.(action)
      return next(action)
    }
    const { api, gate, store, removalReasons } = setup({ after: callOnAction })

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    onAction = (action) => {
      if (!api.endpoints.getThing.matchFulfilled(action)) return
      onAction = undefined
      store.dispatch(
        api.internalActions.removeQueryResult({
          queryCacheKey: promise.queryCacheKey as QueryCacheKey,
        }),
      )
    }
    gate.resolveOldest()

    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'removed' },
    })
    expect(store.getState().api.queries[promise.queryCacheKey]).toBeUndefined()
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

  test('resetApiState while a fulfilled is being dispatched settles the promise with reason "reset"', async () => {
    let onAction: ((action: unknown) => void) | undefined
    const callOnAction: Middleware = () => (next) => (action) => {
      onAction?.(action)
      return next(action)
    }
    const { api, gate, store } = setup({ after: callOnAction })

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    onAction = (action) => {
      if (!api.endpoints.getThing.matchFulfilled(action)) return
      onAction = undefined
      store.dispatch(api.util.resetApiState())
    }
    gate.resolveOldest()

    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'reset' },
    })
    expect(store.getState().api.queries[promise.queryCacheKey]).toBeUndefined()
  })

  test('resetApiState settles and aborts a running request whose entry was overwritten', async () => {
    const { api, store, aborted } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(
      api.util.upsertQueryEntries([
        { endpointName: 'getThing', arg: 'a', value: 5 },
      ]),
    )
    store.dispatch(api.util.resetApiState())

    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'reset' },
    })
    expect(aborted).toEqual(['a'])
  })

  test('a request an abort listener starts during resetApiState keeps running', async () => {
    let react: ((arg: string) => void) | undefined
    const { api, gate, store } = setup({ onAbort: (arg) => react?.(arg) })

    const a = store.dispatch(api.endpoints.getThing.initiate('a'))
    const b = store.dispatch(api.endpoints.getThing.initiate('b'))
    let restarted: typeof b | undefined
    react = (arg) => {
      if (arg !== 'a') return
      react = undefined
      restarted = store.dispatch(api.endpoints.getThing.initiate('b'))
    }
    store.dispatch(api.util.resetApiState())

    await expect(a).resolves.toMatchObject({ error: { message: 'reset' } })
    await expect(b).resolves.toMatchObject({ error: { message: 'reset' } })
    gate.resolveOldest()
    gate.resolveOldest()
    gate.resolveOldest()
    await expect(restarted?.unwrap()).resolves.toBe(3)
    expect(store.getState().api.queries[b.queryCacheKey]?.data).toBe(3)
  })

  test('removing an entry while an initiate and an upsertQueryData for it run', async () => {
    const { api, gate, store } = setup()

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    const upsert = store.dispatch(api.util.upsertQueryData('getThing', 'a', 42))
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: promise.queryCacheKey as QueryCacheKey,
      }),
    )

    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'removed' },
    })
    await expect(upsert).resolves.not.toMatchObject({
      error: { name: 'AbortError' },
    })
    gate.resolveOldest()
    await settle()
    expect(store.getState().api.queries[promise.queryCacheKey]).toBeUndefined()
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

  test('a forced refetch during an upsert of an existing entry fetches', async () => {
    const { api, gate, store, getCalls } = setup()

    const first = store.dispatch(api.endpoints.getThing.initiate('a'))
    gate.resolveOldest()
    await first

    const upsert = store.dispatch(api.util.upsertQueryData('getThing', 'a', 42))
    const cached = store.dispatch(api.endpoints.getThing.initiate('a'))
    const refetched = first.refetch()
    expect(getCalls()).toBe(2)
    await expect(cached).resolves.toMatchObject({ data: 1 })

    await upsert
    gate.resolveOldest()
    await expect(refetched.unwrap()).resolves.toBe(2)
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
  // The entries are refetching, so they already provide their tags. A first
  // fetch provides none until it settles.
  const behaviors = ['delayed', 'immediately'] as const

  test.each(behaviors)(
    '%s: an unsubscribed entry is removed after its request settles, and the promise keeps its result',
    async (invalidationBehavior) => {
      const { api, gate, store, getCalls, removalReasons } = setup({
        invalidationBehavior,
      })

      const first = store.dispatch(
        api.endpoints.getThing.initiate('a', { subscribe: false }),
      )
      gate.resolveOldest()
      await first

      const promise = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscribe: false,
          forceRefetch: true,
        }),
      )
      store.dispatch(api.util.invalidateTags(['Thing']))
      expect(store.getState().api.queries[promise.queryCacheKey]?.status).toBe(
        QueryStatus.pending,
      )

      gate.resolveOldest()
      await expect(promise.unwrap()).resolves.toBe(2)
      expect(
        store.getState().api.queries[promise.queryCacheKey],
      ).toBeUndefined()
      expect(getCalls()).toBe(2)
      await settle()
      expect(removalReasons).toEqual(['removed'])
    },
  )

  test.each(behaviors)(
    '%s: a subscribed entry refetches after its request settles',
    async (invalidationBehavior) => {
      const { api, gate, store, getCalls } = setup({ invalidationBehavior })

      const first = store.dispatch(api.endpoints.getThing.initiate('a'))
      gate.resolveOldest()
      await first

      const promise = first.refetch()
      store.dispatch(api.util.invalidateTags(['Thing']))
      expect(getCalls()).toBe(2)

      gate.resolveOldest()
      await expect(promise.unwrap()).resolves.toBe(2)
      expect(getCalls()).toBe(3)

      gate.resolveOldest()
      await settle()
      expect(store.getState().api.queries[promise.queryCacheKey]?.data).toBe(3)
    },
  )

  test('an invalidation during an upsert of an existing entry applies after the upsert settles', async () => {
    const { api, gate, store, getCalls } = setup({
      invalidationBehavior: 'immediately',
    })

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    gate.resolveOldest()
    await promise

    const upsert = store.dispatch(api.util.upsertQueryData('getThing', 'a', 42))
    store.dispatch(api.util.invalidateTags(['Thing']))
    await upsert
    expect(getCalls()).toBe(2)

    gate.resolveOldest()
    await settle()
    expect(store.getState().api.queries[promise.queryCacheKey]?.data).toBe(2)
  })

  test('a focus refetch of an unsubscribed running entry removes it after its request settles', async () => {
    const { api, gate, store, removalReasons } = setup({ refetchOnFocus: true })

    const promise = store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    store.dispatch(api.internalActions.onFocus())

    gate.resolveOldest()
    await expect(promise.unwrap()).resolves.toBe(1)
    expect(store.getState().api.queries[promise.queryCacheKey]).toBeUndefined()
    await settle()
    expect(removalReasons).toEqual(['removed'])
  })
})
