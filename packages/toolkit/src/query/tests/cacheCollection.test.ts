import type { Middleware, Reducer, UnknownAction } from '@reduxjs/toolkit'
import { configureStore, createAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import type { CombinedState, QueryCacheKey } from '@reduxjs/toolkit/query'
import {
  THIRTY_TWO_BIT_MAX_INT,
  THIRTY_TWO_BIT_MAX_TIMER_SECONDS,
} from '../core/buildMiddleware/cacheCollection'
import { countObjectKeys } from '../utils/index'

beforeAll(() => {
  vi.useFakeTimers()
})

const onCleanup = vi.fn()

beforeEach(() => {
  onCleanup.mockClear()
})

test(`query: await cleanup, defaults`, async () => {
  const { store, api } = storeForApi(
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    }),
  )

  const promise = store.dispatch(api.endpoints.query.initiate('arg'))
  await promise
  promise.unsubscribe()
  vi.advanceTimersByTime(59000)
  expect(onCleanup).not.toHaveBeenCalled()
  vi.advanceTimersByTime(2000)
  expect(onCleanup).toHaveBeenCalled()
})

test(`query: await cleanup, keepUnusedDataFor set`, async () => {
  const { store, api } = storeForApi(
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
      keepUnusedDataFor: 29,
    }),
  )

  const promise = store.dispatch(api.endpoints.query.initiate('arg'))
  await promise
  promise.unsubscribe()
  vi.advanceTimersByTime(28000)
  expect(onCleanup).not.toHaveBeenCalled()
  vi.advanceTimersByTime(2000)
  expect(onCleanup).toHaveBeenCalled()
})

test(`query: handles large keepUnusedDataFor values over 32-bit ms`, async () => {
  const { store, api } = storeForApi(
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
      keepUnusedDataFor: THIRTY_TWO_BIT_MAX_TIMER_SECONDS - 10,
    }),
  )

  const promise = store.dispatch(api.endpoints.query.initiate('arg'))
  await promise
  promise.unsubscribe()

  // Shouldn't have been called right away
  vi.advanceTimersByTime(1000)
  expect(onCleanup).not.toHaveBeenCalled()

  // Shouldn't have been called any time in the next few minutes
  vi.advanceTimersByTime(1_000_000)
  expect(onCleanup).not.toHaveBeenCalled()

  // _Should_ be called _wayyyy_ in the future (like 24.8 days from now)
  vi.advanceTimersByTime(THIRTY_TWO_BIT_MAX_TIMER_SECONDS * 1000)
  expect(onCleanup).toHaveBeenCalled()
})

test(`query: repeated \`initiate\` with \`subscribe: false\` does not reset the removal timer (#4480)`, async () => {
  const { store, api } = storeForApi(
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    }),
  )

  // First unsubscribed request fetches and schedules removal 60s from now.
  await store.dispatch(
    api.endpoints.query.initiate('arg', { subscribe: false }),
  )

  vi.advanceTimersByTime(30000)
  expect(onCleanup).not.toHaveBeenCalled()

  // Second unsubscribed request hits the fresh cache and is rejected by the
  // thunk `condition`. This must NOT restart the `keepUnusedDataFor` timer.
  await store.dispatch(
    api.endpoints.query.initiate('arg', { subscribe: false }),
  )

  // Still not cleaned right before the original 60s deadline...
  vi.advanceTimersByTime(29000)
  expect(onCleanup).not.toHaveBeenCalled()

  // ...but cleaned once the original deadline passes (would still be pending if
  // the second call had reset the timer to fire at 90s).
  vi.advanceTimersByTime(2000)
  expect(onCleanup).toHaveBeenCalled()
})

describe(`query: await cleanup, keepUnusedDataFor set`, () => {
  const { store, api } = storeForApi(
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
        query2: build.query<unknown, string>({
          query: () => '/success',
          keepUnusedDataFor: 35,
        }),
        query3: build.query<unknown, string>({
          query: () => '/success',
          keepUnusedDataFor: 0,
        }),
        query4: build.query<unknown, string>({
          query: () => '/success',
          keepUnusedDataFor: Infinity,
        }),
      }),
      keepUnusedDataFor: 29,
    }),
  )

  test('global keepUnusedDataFor', async () => {
    const promise = store.dispatch(api.endpoints.query.initiate('arg'))
    await promise
    promise.unsubscribe()
    vi.advanceTimersByTime(28000)
    expect(onCleanup).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(onCleanup).toHaveBeenCalled()
  })

  test('endpoint keepUnusedDataFor', async () => {
    const promise = store.dispatch(api.endpoints.query2.initiate('arg'))
    await promise
    promise.unsubscribe()

    vi.advanceTimersByTime(34000)
    expect(onCleanup).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(onCleanup).toHaveBeenCalled()
  })

  test('endpoint keepUnusedDataFor: 0 ', async () => {
    expect(onCleanup).not.toHaveBeenCalled()
    const promise = store.dispatch(api.endpoints.query3.initiate('arg'))
    await promise
    promise.unsubscribe()
    expect(onCleanup).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCleanup).toHaveBeenCalled()
  })

  test('endpoint keepUnusedDataFor: 0, unsubscribed while running: unwrap rejects', async () => {
    const promise = store.dispatch(api.endpoints.query3.initiate('arg2'))
    promise.unsubscribe()
    vi.advanceTimersByTime(1)
    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'removed' },
    })
    await expect(promise.unwrap()).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  test('endpoint keepUnusedDataFor: Infinity', async () => {
    expect(onCleanup).not.toHaveBeenCalled()
    store.dispatch(api.endpoints.query4.initiate('arg')).unsubscribe()
    expect(onCleanup).not.toHaveBeenCalled()
    vi.advanceTimersByTime(THIRTY_TWO_BIT_MAX_INT)
    expect(onCleanup).not.toHaveBeenCalled()
  })
})

describe('resetApiState cleanup', () => {
  test('resetApiState aborts multiple running queries and mutations', async () => {
    const { store, api } = storeForApi(
      createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
        endpoints: (build) => ({
          query1: build.query<unknown, string>({
            query: () => '/success',
          }),
          query2: build.query<unknown, string>({
            query: () => '/success',
          }),
          mutation: build.mutation<unknown, string>({
            query: () => ({
              url: '/success',
              method: 'POST',
            }),
          }),
        }),
      }),
    )

    // Start multiple queries and a mutation
    const queryPromise1 = store.dispatch(api.endpoints.query1.initiate('arg1'))
    const queryPromise2 = store.dispatch(api.endpoints.query2.initiate('arg2'))
    const mutationPromise = store.dispatch(
      api.endpoints.mutation.initiate('arg'),
    )

    // Spy on abort methods
    queryPromise1.abort = vi.fn(queryPromise1.abort)
    queryPromise2.abort = vi.fn(queryPromise2.abort)
    mutationPromise.abort = vi.fn(mutationPromise.abort)

    // Dispatch resetApiState
    store.dispatch(api.util.resetApiState())

    // Verify all aborts were called
    expect(queryPromise1.abort).toHaveBeenCalled()
    expect(queryPromise2.abort).toHaveBeenCalled()
    expect(mutationPromise.abort).toHaveBeenCalled()
  })

  const makeResetApi = () =>
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        query: build.query<unknown, string>({
          query: () => '/success',
        }),
      }),
    })

  test('unwrap rejects for a query aborted by resetApiState', async () => {
    const { store, api } = storeForApi(makeResetApi())
    const promise = store.dispatch(api.endpoints.query.initiate('arg'))
    store.dispatch(api.util.resetApiState())
    await expect(promise.unwrap()).rejects.toMatchObject({
      name: 'AbortError',
      message: 'reset',
    })
  })

  test('unwrap rejects for every caller of a query aborted by resetApiState', async () => {
    const { store, api } = storeForApi(makeResetApi())
    const first = store.dispatch(api.endpoints.query.initiate('arg'))
    const second = store.dispatch(api.endpoints.query.initiate('arg'))
    store.dispatch(api.util.resetApiState())
    await expect(first.unwrap()).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second.unwrap()).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  test('resetApiState cancels the pending subscription sync', async () => {
    const api = createApi({
      baseQuery: async () => ({ data: 'data' }),
      endpoints: (build) => ({
        getThing: build.query<string, void>({ query: () => '' }),
      }),
    })
    const actions: UnknownAction[] = []
    const recorder: Middleware = () => (next) => (action) => {
      actions.push(action as UnknownAction)
      return next(action)
    }
    const store = configureStore({
      reducer: { api: api.reducer },
      middleware: (gdm) =>
        gdm({ serializableCheck: false, immutableCheck: false }).concat(
          api.middleware,
          recorder,
        ),
    })

    await vi.advanceTimersByTimeAsync(1_000)
    store.dispatch(api.endpoints.getThing.initiate())
    store.dispatch(api.util.resetApiState())
    actions.length = 0

    await vi.advanceTimersByTimeAsync(1_000)
    expect(
      actions.filter(api.internalActions.subscriptionsUpdated.match),
    ).toEqual([])
  })
})

describe('removal timer behavior', () => {
  const rehydrate = createAction<{ api: CombinedState<any, any, any> }>(
    'rehydrate',
  )

  const makeApi = () =>
    createApi({
      baseQuery: async (arg: string) => ({ data: `data-${arg}` }),
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
      extractRehydrationInfo(action, { reducerPath }) {
        if (rehydrate.match(action)) {
          return action.payload[reducerPath]
        }
        return undefined
      },
    })

  const key = 'getThing("a")'

  test('resubscribing before the removal timer fires keeps the entry, and a later unsubscribe restarts the full countdown', async () => {
    const { store, api } = storeForApi(makeApi())

    const first = store.dispatch(api.endpoints.getThing.initiate('a'))
    await first
    first.unsubscribe()
    await vi.advanceTimersByTimeAsync(30_000)

    const second = store.dispatch(api.endpoints.getThing.initiate('a'))
    await second
    await vi.advanceTimersByTimeAsync(31_000)
    expect(store.getState().api.queries[key]).toBeDefined()

    second.unsubscribe()
    await vi.advanceTimersByTimeAsync(59_000)
    expect(store.getState().api.queries[key]).toBeDefined()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(store.getState().api.queries[key]).toBeUndefined()
  })

  test('a new subscriber clears the pending removal timer', async () => {
    const { store, api } = storeForApi(makeApi())

    const first = store.dispatch(api.endpoints.getThing.initiate('a'))
    await first
    first.unsubscribe()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(vi.getTimerCount()).toBe(1)

    const second = store.dispatch(api.endpoints.getThing.initiate('a'))
    await second
    await vi.advanceTimersByTimeAsync(1_000)
    expect(vi.getTimerCount()).toBe(0)

    second.unsubscribe()
  })

  test('removeQueryResult clears the removal timer, so it cannot remove a newer entry', async () => {
    const api = createApi({
      baseQuery: async (arg: string) => {
        await new Promise((resolve) => setTimeout(resolve, 20_000))
        return { data: `data-${arg}` }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })
    const { store } = storeForApi(api)

    const first = store.dispatch(api.endpoints.getThing.initiate('a'))
    await vi.advanceTimersByTimeAsync(20_000)
    await first
    first.unsubscribe()

    await vi.advanceTimersByTimeAsync(10_000)
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: key as QueryCacheKey,
      }),
    )
    expect(store.getState().api.queries[key]).toBeUndefined()

    await vi.advanceTimersByTimeAsync(30_000)
    const refetch = store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )

    // The old timer would have fired 60s after the unsubscribe, while the
    // new request is still running.
    await vi.advanceTimersByTimeAsync(20_000)
    const result = await refetch
    expect(result.isSuccess).toBe(true)
    expect(store.getState().api.queries[key]?.data).toBe('data-a')
  })

  test('rehydrated entries with no subscribers are collected after keepUnusedDataFor', async () => {
    const { store: donor, api } = storeForApi(makeApi())
    await donor.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    const snapshot = donor.getState().api

    const { store } = storeForApi(api)
    store.dispatch(rehydrate({ api: snapshot }))
    expect(store.getState().api.queries[key]?.data).toBe('data-a')

    await vi.advanceTimersByTimeAsync(59_000)
    expect(store.getState().api.queries[key]).toBeDefined()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(store.getState().api.queries[key]).toBeUndefined()
  })

  test('mutation results are never collected, whatever keepUnusedDataFor is', async () => {
    const api = createApi({
      baseQuery: async (arg: string) => ({ data: `data-${arg}` }),
      keepUnusedDataFor: 1,
      endpoints: (build) => ({
        update: build.mutation<string, string>({ query: (arg) => arg }),
      }),
    })
    const { store } = storeForApi(api)

    const plain = await store.dispatch(api.endpoints.update.initiate('a'))
    await store.dispatch(
      api.endpoints.update.initiate('b', { fixedCacheKey: 'shared' }),
    )
    await vi.advanceTimersByTimeAsync(120_000)

    expect(plain.data).toBe('data-a')
    expect(Object.keys(store.getState().api.mutations)).toHaveLength(2)
    expect(store.getState().api.mutations.shared?.data).toBe('data-b')
  })
})

function storeForApi<
  A extends {
    reducerPath: 'api'
    reducer: Reducer<any, any>
    middleware: Middleware
    util: { resetApiState(): any }
  },
>(api: A) {
  const store = configureStore({
    reducer: { api: api.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
    enhancers: (gde) =>
      gde({
        autoBatch: false,
      }),
  })
  let hadQueries = false
  store.subscribe(() => {
    const queryState = store.getState().api.queries
    if (hadQueries && countObjectKeys(queryState) === 0) {
      onCleanup()
    }
    hadQueries = hadQueries || countObjectKeys(queryState) > 0
  })
  return { api, store }
}
