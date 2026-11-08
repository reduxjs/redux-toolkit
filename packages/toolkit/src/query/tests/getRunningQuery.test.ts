import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query'

function setup({ keepUnusedDataFor = 1 }: { keepUnusedDataFor?: number } = {}) {
  const pending: (() => void)[] = []
  let calls = 0

  const api = createApi({
    baseQuery: () =>
      new Promise<{ data: number }>((resolve) => {
        const value = ++calls
        pending.push(() => resolve({ data: value }))
      }),
    keepUnusedDataFor,
    endpoints: (build) => ({
      thing: build.query<number, number>({
        query: () => '',
      }),
      pages: build.infiniteQuery<number, number, number>({
        query: ({ pageParam }) => `${pageParam}`,
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
            lastPageParam + 1,
          getPreviousPageParam: (_firstPage, _allPages, firstPageParam) =>
            firstPageParam - 1,
        },
      }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return {
    api,
    store,
    resolveAll() {
      for (const resolve of pending.splice(0)) resolve()
    },
    hasEntry(arg: number) {
      return !api.endpoints.thing.select(arg)(store.getState()).isUninitialized
    },
  }
}

describe('endpoint.getRunningQuery', () => {
  test('returns the running request for an arg, and undefined otherwise', async () => {
    const { api, store, resolveAll } = setup()

    expect(store.dispatch(api.endpoints.thing.getRunningQuery(1))).toBe(
      undefined,
    )

    const promise = store.dispatch(api.endpoints.thing.initiate(1))
    const running = store.dispatch(api.endpoints.thing.getRunningQuery(1))
    expect(running).toBe(promise)
    expect(store.dispatch(api.endpoints.thing.getRunningQuery(2))).toBe(
      undefined,
    )

    resolveAll()
    expect((await running!).data).toBe(1)
    expect(store.dispatch(api.endpoints.thing.getRunningQuery(1))).toBe(
      undefined,
    )
    promise.unsubscribe()
  })

  test('returns the request a joined initiate waits on', async () => {
    const { api, store, resolveAll } = setup()

    const first = store.dispatch(api.endpoints.thing.initiate(1))
    const joined = store.dispatch(api.endpoints.thing.initiate(1))
    expect(store.dispatch(api.endpoints.thing.getRunningQuery(1))).toBe(first)

    resolveAll()
    await joined
    first.unsubscribe()
    joined.unsubscribe()
  })

  test('works for infinite queries', async () => {
    const { api, store, resolveAll } = setup()

    const promise = store.dispatch(api.endpoints.pages.initiate(1))
    expect(store.dispatch(api.endpoints.pages.getRunningQuery(1))).toBe(promise)
    resolveAll()
    await promise
    expect(store.dispatch(api.endpoints.pages.getRunningQuery(1))).toBe(
      undefined,
    )
    promise.unsubscribe()
  })
})

describe('initiate retainFor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function fetchUnsubscribed(
    ctx: ReturnType<typeof setup>,
    retainFor?: number,
  ) {
    const promise = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false, retainFor }),
    )
    ctx.resolveAll()
    await promise
  }

  test('without retainFor, an unsubscribed entry is removed after keepUnusedDataFor', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx)
    await vi.advanceTimersByTimeAsync(1001)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('keeps an unsubscribed entry for retainFor seconds', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx, 5)
    await vi.advanceTimersByTimeAsync(4900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('keepUnusedDataFor wins when it is longer', async () => {
    const ctx = setup({ keepUnusedDataFor: 10 })
    await fetchUnsubscribed(ctx, 2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(5100)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('applies after the last subscriber leaves', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    const sub = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { retainFor: 5 }),
    )
    ctx.resolveAll()
    await sub
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ctx.hasEntry(1)).toBe(true)

    sub.unsubscribe()
    await vi.advanceTimersByTimeAsync(4900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('a cache hit with retainFor restarts the removal timer', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx)
    await vi.advanceTimersByTimeAsync(800)

    await ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false, retainFor: 5 }),
    )
    await vi.advanceTimersByTimeAsync(4900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('a new request with retainFor replaces a running removal timer', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx)
    await vi.advanceTimersByTimeAsync(800)

    const promise = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, {
        subscribe: false,
        forceRefetch: true,
        retainFor: 5,
      }),
    )
    await vi.advanceTimersByTimeAsync(500)
    expect(ctx.hasEntry(1)).toBe(true)
    expect(ctx.store.dispatch(ctx.api.endpoints.thing.getRunningQuery(1))).toBe(
      promise,
    )

    ctx.resolveAll()
    expect((await promise).data).toBe(2)
  })

  test('does not remove an entry while its retainFor request is running', async () => {
    const ctx = setup({ keepUnusedDataFor: 0 })
    const promise = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false, retainFor: 2 }),
    )
    await vi.advanceTimersByTimeAsync(5000)
    expect(ctx.hasEntry(1)).toBe(true)

    ctx.resolveAll()
    expect((await promise).data).toBe(1)
    await vi.advanceTimersByTimeAsync(1900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('retainFor Infinity keeps the entry', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx, Infinity)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(ctx.hasEntry(1)).toBe(true)
  })

  test('a shorter retainFor does not shorten a longer one', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx, 10)
    await vi.advanceTimersByTimeAsync(5000)
    await ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false, retainFor: 2 }),
    )
    await vi.advanceTimersByTimeAsync(9900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('a cache hit without retainFor does not restart the removal timer', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx)
    await vi.advanceTimersByTimeAsync(800)
    await ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false }),
    )
    await vi.advanceTimersByTimeAsync(300)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('values under 1 second are raised to 1 second', async () => {
    const ctx = setup({ keepUnusedDataFor: 0 })
    await fetchUnsubscribed(ctx, 0.1)
    await vi.advanceTimersByTimeAsync(900)
    expect(ctx.hasEntry(1)).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('is forgotten once the entry is removed', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    await fetchUnsubscribed(ctx, 5)
    ctx.store.dispatch(ctx.api.util.resetApiState())

    await fetchUnsubscribed(ctx)
    await vi.advanceTimersByTimeAsync(1100)
    expect(ctx.hasEntry(1)).toBe(false)
  })

  test('a request still running at reset does not retain the next entry', async () => {
    const ctx = setup({ keepUnusedDataFor: 1 })
    const stale = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false, retainFor: 5 }),
    )
    ctx.store.dispatch(ctx.api.util.resetApiState())
    const fresh = ctx.store.dispatch(
      ctx.api.endpoints.thing.initiate(1, { subscribe: false }),
    )
    ctx.resolveAll()
    await Promise.all([stale, fresh])

    await vi.advanceTimersByTimeAsync(1100)
    expect(ctx.hasEntry(1)).toBe(false)
  })
})

describe('infinite query direction joins', () => {
  test('warns when a page fetch joins a request for the other direction', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, store, resolveAll } = setup()

    const first = store.dispatch(api.endpoints.pages.initiate(1))
    resolveAll()
    await first

    const previous = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'backward' }),
    )
    const sameDirection = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'backward' }),
    )
    expect(warn).not.toHaveBeenCalled()

    const next = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'forward' }),
    )
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(
      /forward page fetch .* joined a running backward page fetch/,
    )

    resolveAll()
    await Promise.all([previous, sameDirection, next])
    expect(
      api.endpoints.pages.select(1)(store.getState()).data?.pageParams,
    ).toEqual([-1, 0])

    for (const sub of [first, previous, sameDirection, next]) sub.unsubscribe()
    warn.mockRestore()
  })

  test('does not warn when a page fetch joins an initial load that had a direction', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, store, resolveAll } = setup()

    const first = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'forward' }),
    )
    const previous = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'backward' }),
    )
    expect(warn).not.toHaveBeenCalled()

    resolveAll()
    await Promise.all([first, previous])
    for (const sub of [first, previous]) sub.unsubscribe()
    warn.mockRestore()
  })

  test('does not warn when a page fetch joins a whole-query refetch', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, store, resolveAll } = setup()

    const first = store.dispatch(api.endpoints.pages.initiate(1))
    resolveAll()
    await first

    const refetch = first.refetch()
    const next = store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'forward' }),
    )
    expect(warn).not.toHaveBeenCalled()

    resolveAll()
    await Promise.all([refetch, next])
    for (const sub of [first, next]) sub.unsubscribe()
    warn.mockRestore()
  })
})
