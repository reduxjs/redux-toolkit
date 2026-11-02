import {
  actionsReducer,
  getSubscriptionSelectors,
  setupApiStore,
} from '@internal/tests/utils/helpers'
import type { Middleware } from '@reduxjs/toolkit'
import { delay } from '@internal/utils'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

let calls = 0
const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    increment: build.query<number, void>({
      async queryFn() {
        const data = calls++
        await Promise.resolve()
        return { data }
      },
    }),
    incrementKeep0: build.query<number, void>({
      async queryFn() {
        const data = calls++
        await delay(10)
        return { data }
      },
      keepUnusedDataFor: 0,
    }),
    failing: build.query<void, void>({
      async queryFn() {
        await Promise.resolve()
        return { error: { status: 500, data: 'error' } }
      },
    }),
  }),
})

const storeRef = setupApiStore(api)

let getSubscriptions: SubscriptionSelectors['getSubscriptions']
let isRequestSubscribed: SubscriptionSelectors['isRequestSubscribed']

beforeEach(() => {
  ;({ getSubscriptions, isRequestSubscribed } = storeRef.store.dispatch(
    api.internalActions.internal_getRTKQSubscriptions(),
  ) as unknown as SubscriptionSelectors)
})

test('multiple synchronous initiate calls with pre-existing cache entry', async () => {
  const { store, api } = storeRef
  // seed the store
  const firstValue = await store.dispatch(api.endpoints.increment.initiate())

  expect(firstValue).toMatchObject({ data: 0, status: 'fulfilled' })

  // dispatch another increment
  const secondValuePromise = store.dispatch(api.endpoints.increment.initiate())
  // and one with a forced refresh
  const thirdValuePromise = store.dispatch(
    api.endpoints.increment.initiate(undefined, { forceRefetch: true }),
  )
  // and another increment
  const fourthValuePromise = store.dispatch(api.endpoints.increment.initiate())

  const secondValue = await secondValuePromise
  const thirdValue = await thirdValuePromise
  const fourthValue = await fourthValuePromise

  expect(secondValue).toMatchObject({
    data: firstValue.data,
    status: 'fulfilled',
    requestId: firstValue.requestId,
  })

  expect(thirdValue).toMatchObject({ data: 1, status: 'fulfilled' })
  expect(thirdValue.requestId).not.toBe(firstValue.requestId)
  expect(fourthValue).toMatchObject({
    data: thirdValue.data,
    status: 'fulfilled',
    requestId: thirdValue.requestId,
  })
})

describe('calling initiate without a cache entry, with subscribe: false still returns correct values', () => {
  test('successful query', async () => {
    const { store, api } = storeRef
    calls = 0
    const promise = store.dispatch(
      api.endpoints.increment.initiate(undefined, { subscribe: false }),
    )
    expect(isRequestSubscribed('increment(undefined)', promise.requestId)).toBe(
      false,
    )

    await expect(promise).resolves.toMatchObject({
      data: 0,
      status: 'fulfilled',
    })
  })

  test('successful query with keepUnusedDataFor: 0', async () => {
    const { store, api } = storeRef
    calls = 0
    const promise = store.dispatch(
      api.endpoints.incrementKeep0.initiate(undefined, { subscribe: false }),
    )
    expect(isRequestSubscribed('increment(undefined)', promise.requestId)).toBe(
      false,
    )

    await expect(promise.unwrap()).resolves.toBe(0)
  })

  test('rejected query', async () => {
    const { store, api } = storeRef
    calls = 0
    const promise = store.dispatch(
      api.endpoints.failing.initiate(undefined, { subscribe: false }),
    )
    expect(isRequestSubscribed('failing(undefined)', promise.requestId)).toBe(
      false,
    )

    await expect(promise).resolves.toMatchObject({
      status: 'rejected',
    })
  })
})

describe('calling initiate should have resulting queryCacheKey match baseQuery queryCacheKey', () => {
  const baseQuery = vi.fn(() => ({ data: 'success' }))
  function getNewApi() {
    return createApi({
      baseQuery,
      endpoints: (build) => ({
        query: build.query<void, { arg1: string; arg2: string }>({
          query: (args) => `queryUrl/${args.arg1}/${args.arg2}`,
        }),
        mutation: build.mutation<void, { arg1: string; arg2: string }>({
          query: () => 'mutationUrl',
        }),
      }),
    })
  }
  let api = getNewApi()
  beforeEach(() => {
    baseQuery.mockClear()
    api = getNewApi()
  })

  test('should be a string and matching on queries', () => {
    const { store: storeApi } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const promise = storeApi.dispatch(
      api.endpoints.query.initiate({ arg2: 'secondArg', arg1: 'firstArg' }),
    )
    expect(baseQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        queryCacheKey: promise.queryCacheKey,
      }),
      undefined,
    )
  })

  test('should be undefined and matching on mutations', () => {
    const { store: storeApi } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    storeApi.dispatch(
      api.endpoints.mutation.initiate({ arg2: 'secondArg', arg1: 'firstArg' }),
    )
    expect(baseQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        queryCacheKey: undefined,
      }),
      undefined,
    )
  })
})

describe('running queries during delayed invalidation', () => {
  const queryFn = vi.fn<() => Promise<{ data: string }>>()
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Item'],
    endpoints: (build) => ({
      getItem: build.query<string, void>({
        queryFn: () => queryFn(),
        providesTags: ['Item'],
      }),
    }),
  })
  const storeRef = setupApiStore(api)
  let replies: Array<(value: { data: string }) => void>

  beforeEach(() => {
    replies = []
    queryFn
      .mockReset()
      .mockImplementation(() => new Promise((resolve) => replies.push(resolve)))
  })

  async function startRefetch() {
    const initial = storeRef.store.dispatch(api.endpoints.getItem.initiate())
    storeRef.store.dispatch(api.util.invalidateTags(['Item']))
    replies[0]({ data: 'initial' })
    await initial
    await delay(0)
    expect(queryFn).toHaveBeenCalledTimes(2)
    return { initial }
  }

  test('tracks the refetch and lets subsequent initiations join it', async () => {
    const { initial } = await startRefetch()
    const { store } = storeRef
    const refetch = store.dispatch(
      api.util.getRunningQueryThunk('getItem', undefined),
    )

    expect(refetch).toBeDefined()
    expect(refetch?.requestId).not.toBe(initial.requestId)
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([refetch])

    const joined = store.dispatch(api.endpoints.getItem.initiate())
    const settled = vi.fn()
    void joined.then(settled)
    await delay(0)
    expect(settled).not.toHaveBeenCalled()
    expect(queryFn).toHaveBeenCalledTimes(2)

    replies[1]({ data: 'refetched' })
    await expect(joined.unwrap()).resolves.toBe('refetched')
    await expect(refetch?.unwrap()).resolves.toBe('refetched')
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
  })

  test('can abort the refetch through the running query registry', async () => {
    await startRefetch()
    const { store } = storeRef
    const refetch = store.dispatch(
      api.util.getRunningQueryThunk('getItem', undefined),
    )

    expect(refetch).toBeDefined()
    refetch!.abort()
    await expect(refetch).resolves.toMatchObject({
      status: 'rejected',
      error: { name: 'AbortError' },
    })
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    replies[1]({ data: 'too late' })
  })
})

describe('running queries when dispatching the result throws', () => {
  const error = new Error('middleware failed')
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getItem: build.query<string, void>({
        queryFn: async () => ({ data: 'item' }),
      }),
    }),
  })
  const throwOnFulfilled: Middleware = () => (next) => (action) => {
    const result = next(action)
    if (api.endpoints.getItem.matchFulfilled(action)) {
      throw error
    }
    return result
  }
  const storeRef = setupApiStore(api, undefined, {
    middleware: { concat: [throwOnFulfilled] },
  })

  test('removes the running query when the request promise rejects', async () => {
    const { store } = storeRef
    const promise = store.dispatch(api.endpoints.getItem.initiate())
    expect(
      store.dispatch(api.util.getRunningQueryThunk('getItem', undefined)),
    ).toBe(promise)

    await expect(promise).rejects.toBe(error)
    await delay(0)
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
  })
})

describe('getRunningQueryThunk with multiple stores', () => {
  test('should isolate running queries between different store instances using the same API', async () => {
    // Create a shared API instance
    const sharedApi = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        testQuery: build.query<string, string>({
          async queryFn(arg) {
            // Add delay to ensure queries are running when we check
            await new Promise((resolve) => setTimeout(resolve, 50))
            return { data: `result-${arg}` }
          },
        }),
      }),
    })

    // Create two separate stores using the same API instance
    const store1 = setupApiStore(sharedApi, undefined, {
      withoutTestLifecycles: true,
    }).store
    const store2 = setupApiStore(sharedApi, undefined, {
      withoutTestLifecycles: true,
    }).store

    // Start queries on both stores
    const query1Promise = store1.dispatch(
      sharedApi.endpoints.testQuery.initiate('arg1'),
    )
    const query2Promise = store2.dispatch(
      sharedApi.endpoints.testQuery.initiate('arg2'),
    )

    // Verify that getRunningQueryThunk returns the correct query for each store
    const runningQuery1 = store1.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg1'),
    )
    const runningQuery2 = store2.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg2'),
    )

    // Each store should only see its own running query
    expect(runningQuery1).toBeDefined()
    expect(runningQuery2).toBeDefined()
    expect(runningQuery1?.requestId).toBe(query1Promise.requestId)
    expect(runningQuery2?.requestId).toBe(query2Promise.requestId)

    // Cross-store queries should not be visible
    const crossQuery1 = store1.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg2'),
    )
    const crossQuery2 = store2.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg1'),
    )

    expect(crossQuery1).toBeUndefined()
    expect(crossQuery2).toBeUndefined()

    // Wait for queries to complete
    await Promise.all([query1Promise, query2Promise])

    // After completion, getRunningQueryThunk should return undefined for both stores
    const completedQuery1 = store1.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg1'),
    )
    const completedQuery2 = store2.dispatch(
      sharedApi.util.getRunningQueryThunk('testQuery', 'arg2'),
    )

    expect(completedQuery1).toBeUndefined()
    expect(completedQuery2).toBeUndefined()
  })

  test('should handle same query args on different stores independently', async () => {
    // Create a shared API instance
    const sharedApi = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        sameArgQuery: build.query<string, string>({
          async queryFn(arg) {
            await new Promise((resolve) => setTimeout(resolve, 50))
            return { data: `result-${arg}-${Math.random()}` }
          },
        }),
      }),
    })

    // Create two separate stores
    const store1 = setupApiStore(sharedApi, undefined, {
      withoutTestLifecycles: true,
    }).store
    const store2 = setupApiStore(sharedApi, undefined, {
      withoutTestLifecycles: true,
    }).store

    // Start the same query on both stores
    const sameArg = 'shared-arg'
    const query1Promise = store1.dispatch(
      sharedApi.endpoints.sameArgQuery.initiate(sameArg),
    )
    const query2Promise = store2.dispatch(
      sharedApi.endpoints.sameArgQuery.initiate(sameArg),
    )

    // Both stores should see their own running query with the same cache key
    const runningQuery1 = store1.dispatch(
      sharedApi.util.getRunningQueryThunk('sameArgQuery', sameArg),
    )
    const runningQuery2 = store2.dispatch(
      sharedApi.util.getRunningQueryThunk('sameArgQuery', sameArg),
    )

    expect(runningQuery1).toBeDefined()
    expect(runningQuery2).toBeDefined()
    expect(runningQuery1?.requestId).toBe(query1Promise.requestId)
    expect(runningQuery2?.requestId).toBe(query2Promise.requestId)

    // The request IDs should be different even though the cache key is the same
    expect(runningQuery1?.requestId).not.toBe(runningQuery2?.requestId)

    // But the cache keys should be the same
    expect(runningQuery1?.queryCacheKey).toBe(runningQuery2?.queryCacheKey)

    // Wait for completion
    await Promise.all([query1Promise, query2Promise])
  })
})

describe('query promise behavior', () => {
  const baseQuery = vi.fn(async (arg: string) => {
    await delay(1)
    return { data: `data-${arg}` }
  })

  const promiseApi = createApi({
    baseQuery,
    tagTypes: ['Thing'],
    endpoints: (build) => ({
      getThing: build.query<string, string>({
        query: (arg) => arg,
        providesTags: ['Thing'],
      }),
      failing: build.query<string, string>({
        queryFn: async () => ({
          error: { status: 500, data: 'boom' } as FetchBaseQueryError,
        }),
      }),
    }),
  })

  const promiseStoreRef = setupApiStore(promiseApi, { ...actionsReducer })

  const countSubscribers = (queryCacheKey: string) =>
    getSubscriptionSelectors(
      promiseApi,
      promiseStoreRef.store.dispatch,
    ).getSubscriptionCount(queryCacheKey)

  beforeEach(() => {
    baseQuery.mockClear()
  })

  test('initiate subscribes by default, and unsubscribe() on a subscribe: false promise does nothing', async () => {
    const { store } = promiseStoreRef

    const subscribed = store.dispatch(
      promiseApi.endpoints.getThing.initiate('a'),
    )
    await subscribed
    expect(countSubscribers(subscribed.queryCacheKey)).toBe(1)

    const unsubscribed = store.dispatch(
      promiseApi.endpoints.getThing.initiate('b', { subscribe: false }),
    )
    await unsubscribed
    expect(countSubscribers(unsubscribed.queryCacheKey)).toBe(0)

    const actionsBefore = store.getState().actions.length
    expect(() => unsubscribed.unsubscribe()).not.toThrow()
    expect(store.getState().actions.length).toBe(actionsBefore)

    subscribed.unsubscribe()
    expect(countSubscribers(subscribed.queryCacheKey)).toBe(0)
  })

  test('a cache hit returns a promise whose requestId differs from the stored requestId', async () => {
    const { store } = promiseStoreRef

    const first = store.dispatch(promiseApi.endpoints.getThing.initiate('cond'))
    await first

    const cacheHit = store.dispatch(
      promiseApi.endpoints.getThing.initiate('cond', { subscribe: false }),
    )
    await cacheHit

    const entry = store.getState().api.queries[cacheHit.queryCacheKey]!
    expect(entry.requestId).toBe(first.requestId)
    expect(entry.requestId).not.toBe(cacheHit.requestId)

    const rejected = store
      .getState()
      .actions.filter(promiseApi.endpoints.getThing.matchRejected)
      .filter((action) => action.meta.requestId === cacheHit.requestId)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].meta.condition).toBe(true)

    first.unsubscribe()
  })

  test('an aborted query resolves with the rejected cache state, keeps prior data, and does not block later requests', async () => {
    const { store } = promiseStoreRef

    const first = store.dispatch(
      promiseApi.endpoints.getThing.initiate('abort-me'),
    )
    await first

    const refetching = first.refetch()
    refetching.abort()

    const resolved = await refetching
    expect(resolved.isError).toBe(true)
    expect(resolved.status).toBe('rejected')
    expect(resolved.data).toBe('data-abort-me')

    const entry = store.getState().api.queries[first.queryCacheKey]!
    expect(entry.status).toBe('rejected')
    expect(entry.data).toBe('data-abort-me')
    expect(entry.error).toMatchObject({ name: 'AbortError' })

    const abortedAction = store
      .getState()
      .actions.filter(promiseApi.endpoints.getThing.matchRejected)
      .find((action) => action.meta.requestId === refetching.requestId)
    expect(abortedAction?.meta.aborted).toBe(true)

    baseQuery.mockClear()
    await first.refetch()
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(store.getState().api.queries[first.queryCacheKey]!.status).toBe(
      'fulfilled',
    )

    first.unsubscribe()
  })

  test('unwrap() settles after the query promise and throws the error stored on the cache entry', async () => {
    const { store } = promiseStoreRef

    const promise = store.dispatch(
      promiseApi.endpoints.getThing.initiate('unwrap'),
    )
    const order: string[] = []
    const unwrapped = promise.unwrap().then(() => {
      order.push('unwrap')
    })
    const settled = promise.then(() => {
      order.push('promise')
    })
    await Promise.all([unwrapped, settled])
    expect(order).toEqual(['promise', 'unwrap'])
    promise.unsubscribe()

    const failing = store.dispatch(
      promiseApi.endpoints.failing.initiate('nope'),
    )
    await failing
    const entryError =
      store.getState().api.queries[failing.queryCacheKey]!.error
    await expect(failing.unwrap()).rejects.toEqual(entryError)
    failing.unsubscribe()
  })

  test('refetch() forces a request without adding a subscription', async () => {
    const { store } = promiseStoreRef

    const promise = store.dispatch(
      promiseApi.endpoints.getThing.initiate('refetch'),
    )
    await promise
    expect(countSubscribers(promise.queryCacheKey)).toBe(1)

    baseQuery.mockClear()
    await promise.refetch()

    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(countSubscribers(promise.queryCacheKey)).toBe(1)

    promise.unsubscribe()
    expect(countSubscribers(promise.queryCacheKey)).toBe(0)
  })

  test('upsertQueryData resolves with the written data and is not tracked as a running query', async () => {
    const { store } = promiseStoreRef

    const upsert = store.dispatch(
      promiseApi.util.upsertQueryData('getThing', 'upserted', 'from-upsert'),
    )

    expect(
      store.dispatch(promiseApi.util.getRunningQueriesThunk()),
    ).toHaveLength(0)

    await upsert

    const entry = promiseApi.endpoints.getThing.select('upserted')(
      store.getState(),
    )
    expect(entry.originalArgs).toBe('upserted')
    expect(entry.data).toBe('from-upsert')
    expect(entry.status).toBe('fulfilled')
  })

  test('a subscribe: false query still writes its provided tags', async () => {
    const { store } = promiseStoreRef

    const promise = store.dispatch(
      promiseApi.endpoints.getThing.initiate('tags', { subscribe: false }),
    )
    await promise

    const invalidatable = promiseApi.util.selectInvalidatedBy(
      store.getState(),
      ['Thing'],
    )
    expect(invalidatable).toEqual([
      {
        endpointName: 'getThing',
        originalArgs: 'tags',
        queryCacheKey: promise.queryCacheKey,
      },
    ])
  })
})

describe('query dedupe and forceRefetch', () => {
  const forcedValues: Array<boolean | undefined> = []
  let resolveGate: (() => void) | undefined

  const baseQuery = vi.fn(
    async (arg: string, baseApi: { forced?: boolean }) => {
      forcedValues.push(baseApi.forced)
      if (arg === 'gated') {
        await new Promise<void>((resolve) => {
          resolveGate = resolve
        })
      }
      return { data: `data-${arg}` }
    },
  )

  const forceRefetchCallback = vi.fn(
    (_params: {
      currentArg: string | undefined
      previousArg: string | undefined
      endpointState?: unknown
      state: unknown
    }) => false,
  )

  const dedupeApi = createApi({
    baseQuery,
    endpoints: (build) => ({
      getThing: build.query<string, string>({ query: (arg) => arg }),
      withForceCallback: build.query<string, string>({
        query: (arg) => arg,
        forceRefetch: (params) => forceRefetchCallback(params),
      }),
    }),
  })

  const dedupeStoreRef = setupApiStore(dedupeApi, { ...actionsReducer })

  beforeEach(() => {
    baseQuery.mockClear()
    forceRefetchCallback.mockClear()
    forceRefetchCallback.mockReturnValue(false)
    forcedValues.length = 0
    resolveGate = undefined
  })

  test('forceRefetch: true while a request is pending reuses the running request', async () => {
    const { store } = dedupeStoreRef

    const first = store.dispatch(dedupeApi.endpoints.getThing.initiate('gated'))
    await delay(1)
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const forced = store.dispatch(
      dedupeApi.endpoints.getThing.initiate('gated', {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    await delay(1)
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(forced.requestId).not.toBe(first.requestId)

    resolveGate!()
    const [firstResult, forcedResult] = await Promise.all([first, forced])
    expect(firstResult.data).toBe('data-gated')
    expect(forcedResult.data).toBe('data-gated')
    expect(baseQuery).toHaveBeenCalledTimes(1)

    first.unsubscribe()
  })

  test('a numeric forceRefetch is a maximum cache age in seconds', async () => {
    const { store } = dedupeStoreRef

    const first = store.dispatch(dedupeApi.endpoints.getThing.initiate('age'))
    await first
    expect(baseQuery).toHaveBeenCalledTimes(1)

    await store.dispatch(
      dedupeApi.endpoints.getThing.initiate('age', {
        subscribe: false,
        forceRefetch: 10,
      }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)

    try {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(Date.now() + 11_000)

      await store.dispatch(
        dedupeApi.endpoints.getThing.initiate('age', {
          subscribe: false,
          forceRefetch: 10,
        }),
      )
      expect(baseQuery).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }

    first.unsubscribe()
  })

  test('a numeric forceRefetch passes forced: false to the base query on the first fetch, while forceRefetch: true passes forced: true', async () => {
    const { store } = dedupeStoreRef

    await store.dispatch(
      dedupeApi.endpoints.getThing.initiate('numeric-first', {
        subscribe: false,
        forceRefetch: 10,
      }),
    )
    expect(forcedValues).toEqual([false])

    await store.dispatch(
      dedupeApi.endpoints.getThing.initiate('bool-first', {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    expect(forcedValues).toEqual([false, true])
  })

  test('the endpoint forceRefetch callback can start a request, but forced stays false', async () => {
    const { store } = dedupeStoreRef

    await store.dispatch(
      dedupeApi.endpoints.withForceCallback.initiate('cb', {
        subscribe: false,
      }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)

    forceRefetchCallback.mockClear()
    forceRefetchCallback.mockReturnValue(true)

    await store.dispatch(
      dedupeApi.endpoints.withForceCallback.initiate('cb', {
        subscribe: false,
      }),
    )

    expect(forceRefetchCallback).toHaveBeenCalledTimes(1)
    const params = forceRefetchCallback.mock.calls[0][0]
    expect(Object.keys(params).sort()).toEqual([
      'currentArg',
      'endpointState',
      'previousArg',
      'state',
    ])
    expect(params.currentArg).toBe('cb')
    expect(params.previousArg).toBe('cb')

    expect(baseQuery).toHaveBeenCalledTimes(2)
    expect(forcedValues).toEqual([false, false])
  })

  test('a subscribing cache hit adds a subscription without dispatching a rejected action to reducers', async () => {
    const { store } = dedupeStoreRef
    const countSubscribers = (queryCacheKey: string) =>
      getSubscriptionSelectors(dedupeApi, store.dispatch).getSubscriptionCount(
        queryCacheKey,
      )

    const first = store.dispatch(dedupeApi.endpoints.getThing.initiate('dedup'))
    await first
    const key = first.queryCacheKey
    expect(countSubscribers(key)).toBe(1)

    const actionsBefore = store.getState().actions.length

    const second = store.dispatch(
      dedupeApi.endpoints.getThing.initiate('dedup'),
    )
    await second

    expect(countSubscribers(key)).toBe(2)
    expect(
      store
        .getState()
        .actions.slice(actionsBefore)
        .filter(dedupeApi.endpoints.getThing.matchRejected),
    ).toEqual([])

    const entry = store.getState().api.queries[key]!
    expect(entry.status).toBe('fulfilled')
    expect(entry.error).toBeUndefined()

    first.unsubscribe()
    second.unsubscribe()
  })

  test('a subscribe: false request ignores the global refetchOnMountOrArgChange option', async () => {
    const requests: string[] = []
    const refetchApi = createApi({
      refetchOnMountOrArgChange: true,
      baseQuery: async (arg: string) => {
        requests.push(arg)
        return { data: arg }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })
    const { store } = setupApiStore(refetchApi, undefined, {
      withoutTestLifecycles: true,
    })

    const first = store.dispatch(refetchApi.endpoints.getThing.initiate('a'))
    await first
    expect(requests).toEqual(['a'])

    await store.dispatch(
      refetchApi.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    expect(requests).toEqual(['a'])

    const third = store.dispatch(refetchApi.endpoints.getThing.initiate('a'))
    await third
    expect(requests).toEqual(['a', 'a'])

    first.unsubscribe()
    third.unsubscribe()
  })
})

describe('mutation promise and running mutations', () => {
  function createGate() {
    const waiting: (() => void)[] = []
    return {
      wait: () => new Promise<void>((resolve) => waiting.push(resolve)),
      releaseOldest: () => waiting.shift()?.(),
    }
  }

  test('identical concurrent mutations each run the base query', async () => {
    let baseQueryCalls = 0
    const gate = createGate()
    const api = createApi({
      baseQuery: async () => {
        baseQueryCalls++
        await gate.wait()
        return { data: null }
      },
      endpoints: (build) => ({
        update: build.mutation<null, number>({ query: (id) => `${id}` }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const first = store.dispatch(api.endpoints.update.initiate(1))
    const second = store.dispatch(api.endpoints.update.initiate(1))
    expect(first.requestId).not.toBe(second.requestId)
    await vi.waitFor(() => expect(baseQueryCalls).toBe(2))

    gate.releaseOldest()
    gate.releaseOldest()
    expect(await first).toEqual({ data: null })
    expect(await second).toEqual({ data: null })
  })

  test('a running mutation is registered by requestId and fixedCacheKey until it settles', async () => {
    let seenAfterQueryFulfilled: unknown = 'not run'
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<null, void>({
          queryFn: async () => {
            await delay(1)
            return { data: null }
          },
          async onQueryStarted(_, { dispatch, queryFulfilled }) {
            await queryFulfilled
            seenAfterQueryFulfilled = dispatch(
              api.util.getRunningMutationThunk('update', 'shared'),
            )
          },
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const running = (key: string) =>
      store.dispatch(api.util.getRunningMutationThunk('update', key))

    expect(running('never-started')).toBeUndefined()
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])

    const promise = store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    expect(running(promise.requestId)).toBe(promise)
    expect(running('shared')).toBe(promise)
    // The same promise fills both slots, so the list contains it twice.
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([
      promise,
      promise,
    ])

    await promise

    expect(seenAfterQueryFulfilled).toBe(promise)
    expect(running(promise.requestId)).toBeUndefined()
    expect(running('shared')).toBeUndefined()
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
  })

  test('a mutation that settles after being superseded leaves the fixedCacheKey slot to the newer one', async () => {
    const gate = createGate()
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<number, number>({
          queryFn: async (n) => {
            await gate.wait()
            return { data: n }
          },
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const running = (key: string) =>
      store.dispatch(api.util.getRunningMutationThunk('update', key))

    const first = store.dispatch(
      api.endpoints.update.initiate(1, { fixedCacheKey: 'shared' }),
    )
    const second = store.dispatch(
      api.endpoints.update.initiate(2, { fixedCacheKey: 'shared' }),
    )
    expect(running('shared')).toBe(second)

    gate.releaseOldest()
    await first
    await delay(1)
    expect(running(first.requestId)).toBeUndefined()
    expect(running('shared')).toBe(second)

    gate.releaseOldest()
    await second
    await delay(1)
    expect(running('shared')).toBeUndefined()
  })

  test('reset() removes the mutation result at once but does not abort the request', async () => {
    const gate = createGate()
    let queryCount = 0
    let queryFulfilledResolved = false
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPosts: build.query<number, void>({
          queryFn: () => ({ data: ++queryCount }),
          providesTags: ['Post'],
        }),
        update: build.mutation<string, void>({
          queryFn: async () => {
            await gate.wait()
            return { data: 'done' }
          },
          invalidatesTags: ['Post'],
          async onQueryStarted(_, { queryFulfilled }) {
            await queryFulfilled
            queryFulfilledResolved = true
          },
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(1)
    expect(queryCount).toBe(1)

    const mutation = store.dispatch(api.endpoints.update.initiate())
    expect(store.getState().api.mutations[mutation.requestId]?.status).toBe(
      'pending',
    )
    mutation.reset()
    expect(store.getState().api.mutations[mutation.requestId]).toBeUndefined()

    gate.releaseOldest()
    const result = await mutation
    await delay(1)

    expect(result).toEqual({ data: 'done' })
    expect(queryFulfilledResolved).toBe(true)
    // The late result is not written back, but its tags are still invalidated.
    expect(store.getState().api.mutations[mutation.requestId]).toBeUndefined()
    expect(queryCount).toBe(2)
  })
})
