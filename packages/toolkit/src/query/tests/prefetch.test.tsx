import { createApi } from '@reduxjs/toolkit/query/react'
import { setupApiStore, waitMs } from './helpers'

beforeAll(() => {
  jest.useFakeTimers()
})

const mockBaseQuery = jest
  .fn()
  .mockImplementation((args: any) => Promise.resolve({ data: args }))

describe('Query prefetches', () => {
  const apiKeepPrefetchSubscriptionsFor = 5
  const apiKeepUnusedDataFor = 5
  const queryKey = 'query("dada")'
  const api = createApi({
    baseQuery: mockBaseQuery,
    keepPrefetchSubscriptionsFor: apiKeepPrefetchSubscriptionsFor,
    keepUnusedDataFor: apiKeepUnusedDataFor,
    endpoints: (build) => ({
      query: build.query<unknown, string>({
        query: () => '/success',
      }),
    }),
  })

  const { store } = setupApiStore(api)

  const getSubscriptionsKeysOf = (
    store: ReturnType<typeof setupApiStore>['store'],
    key: string
  ) => {
    return Object.keys(store.getState().api.subscriptions[key] ?? {})
  }

  test('prefetch subscription gets removed after options.keepSubscriptionFor', async () => {
    store.dispatch(
      api.util.prefetch('query', 'dada', {
        force: true,
        keepSubscriptionFor: 1,
      })
    )

    await api.util.getRunningOperationPromises()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'pending'
    )

    jest.advanceTimersByTime(1_000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(0)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'fulfilled'
    )

    jest.advanceTimersByTime(apiKeepUnusedDataFor * 1000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(0)
    expect(store.getState().api.queries[queryKey]).not.toBeDefined()
  })

  test('prefetch subscription gets removed after api.config if options.keepSubscriptionFor is not provided', async () => {
    store.dispatch(api.util.prefetch('query', 'dada', { force: true }))

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'pending'
    )

    jest.advanceTimersByTime(apiKeepPrefetchSubscriptionsFor * 1000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(0)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'fulfilled'
    )
  })

  test('multiple prefetch invocations create at most a single subscription', async () => {
    const prefetchOptions = { force: true, keepSubscriptionFor: 10 }

    store.dispatch(api.util.prefetch('query', 'dada', prefetchOptions))

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'pending'
    )

    jest.advanceTimersByTime(1000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'fulfilled'
    )

    store.dispatch(api.util.prefetch('query', 'dada', prefetchOptions))

    jest.advanceTimersByTime(1000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'fulfilled'
    )
  })

  test('prefetch invocations reset the subscription timeout', async () => {
    const prefetchOptions = { force: true, keepSubscriptionFor: 10 }

    store.dispatch(api.util.prefetch('query', 'dada', prefetchOptions))

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'pending'
    )

    jest.advanceTimersByTime(9000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)
    expect(store.getState().api.queries[queryKey]).toHaveProperty(
      'status',
      'fulfilled'
    )

    store.dispatch(api.util.prefetch('query', 'dada', prefetchOptions))

    jest.advanceTimersByTime(3000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(1)

    jest.advanceTimersByTime(9000)
    await waitMs()

    expect(getSubscriptionsKeysOf(store, queryKey)).toHaveLength(0)
  })
})
