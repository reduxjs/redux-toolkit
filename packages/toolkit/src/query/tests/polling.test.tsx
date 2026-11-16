import { configureStore } from '@reduxjs/toolkit'
import type { UnknownAction } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query'
import type {
  PollingInterval,
  QueryActionCreatorResult,
} from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'
import type { QueryCacheKey } from '../core/apiState'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

const mockBaseQuery = vi
  .fn()
  .mockImplementation((args: any) => ({ data: args }))

const api = createApi({
  baseQuery: mockBaseQuery,
  tagTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<unknown, number>({
      query(pageNumber) {
        return { url: 'posts', params: pageNumber }
      },
      providesTags: ['Posts'],
    }),
  }),
})
const { getPosts } = api.endpoints

const storeRef = setupApiStore(api)

let getSubscriptions: SubscriptionSelectors['getSubscriptions']

beforeEach(() => {
  ;({ getSubscriptions } = storeRef.store.dispatch(
    api.internalActions.internal_getRTKQSubscriptions(),
  ) as unknown as SubscriptionSelectors)

  const pollUpdateCounters = getPollUpdateCounters(storeRef.store.dispatch)
  for (const key of Object.keys(pollUpdateCounters)) {
    delete pollUpdateCounters[key]
  }
})

function getPollUpdateCounters(dispatch: (action: UnknownAction) => unknown) {
  return dispatch({
    type: `${api.reducerPath}/getPollUpdateCounters`,
  }) as Record<string, number>
}

const getSubscribersForQueryCacheKey = (queryCacheKey: string) =>
  getSubscriptions().get(queryCacheKey) ?? new Map()
const createSubscriptionGetter = (queryCacheKey: string) => () =>
  getSubscribersForQueryCacheKey(queryCacheKey)

describe('polling tests', () => {
  it('clears intervals when seeing a resetApiState action', async () => {
    await storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      }),
    )

    expect(mockBaseQuery).toHaveBeenCalledOnce()

    storeRef.store.dispatch(api.util.resetApiState())

    await delay(30)

    expect(mockBaseQuery).toHaveBeenCalledOnce()
  })

  it('replaces polling interval when the subscription options are updated', async () => {
    const { requestId, queryCacheKey, ...subscription } =
      storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 10 },
          subscribe: true,
        }),
      )

    const getSubs = createSubscriptionGetter(queryCacheKey)

    await delay(1)
    expect(getSubs().size).toBe(1)
    expect(getSubs()?.get(requestId)?.pollingInterval).toBe(10)

    subscription.updateSubscriptionOptions({ pollingInterval: 20 })

    await delay(1)
    expect(getSubs().size).toBe(1)
    expect(getSubs()?.get(requestId)?.pollingInterval).toBe(20)
  })

  it(`doesn't replace the interval when removing a shared query instance with a poll `, async () => {
    const subscriptionOne = storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      }),
    )

    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      }),
    )

    await delay(10)

    const getSubs = createSubscriptionGetter(subscriptionOne.queryCacheKey)

    expect(getSubs().size).toBe(2)

    subscriptionOne.unsubscribe()

    await delay(1)
    expect(getSubs().size).toBe(1)
  })

  it('uses lowest specified interval when two components are mounted', async () => {
    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 30000 },
        subscribe: true,
      }),
    )

    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      }),
    )

    await delay(20)

    expect(mockBaseQuery.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('respects skipPollingIfUnfocused', async () => {
    mockBaseQuery.mockClear()
    storeRef.store.dispatch(
      getPosts.initiate(2, {
        subscriptionOptions: {
          pollingInterval: 10,
          skipPollingIfUnfocused: true,
        },
        subscribe: true,
      }),
    )
    storeRef.store.dispatch(api.internalActions?.onFocusLost())

    await delay(50)
    const callsWithSkip = mockBaseQuery.mock.calls.length

    storeRef.store.dispatch(
      getPosts.initiate(2, {
        subscriptionOptions: {
          pollingInterval: 10,
          skipPollingIfUnfocused: false,
        },
        subscribe: true,
      }),
    )

    storeRef.store.dispatch(api.internalActions?.onFocus())

    await delay(50)
    const callsWithoutSkip = mockBaseQuery.mock.calls.length

    expect(callsWithSkip).toBe(1)
    expect(callsWithoutSkip).toBeGreaterThanOrEqual(2)

    storeRef.store.dispatch(api.util.resetApiState())
  })

  it('uses current focus state when a scheduled poll fires', async () => {
    mockBaseQuery.mockClear()
    const subscription = storeRef.store.dispatch(
      getPosts.initiate(4, {
        subscriptionOptions: {
          pollingInterval: 10,
          skipPollingIfUnfocused: true,
        },
        subscribe: true,
      }),
    )

    await subscription
    storeRef.store.dispatch(api.internalActions.onFocusLost())
    await delay(30)

    expect(mockBaseQuery).toHaveBeenCalledOnce()
  })

  it('does not revive a cache entry removed after its poll is scheduled', async () => {
    mockBaseQuery.mockClear()
    const subscription = storeRef.store.dispatch(
      getPosts.initiate(5, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      }),
    )

    await subscription
    storeRef.store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: subscription.queryCacheKey as any,
      }),
    )
    await delay(30)

    expect(getPosts.select(5)(storeRef.store.getState()).status).toBe(
      'uninitialized',
    )
    expect(mockBaseQuery).toHaveBeenCalledOnce()
  })

  it('continues polling while unfocused if a polling subscription allows it', async () => {
    storeRef.store.dispatch(
      getPosts.initiate(3, {
        subscriptionOptions: {
          pollingInterval: 10,
          skipPollingIfUnfocused: false,
        },
        subscribe: true,
      }),
    )

    await delay(50)
    const callsWithoutSkip = mockBaseQuery.mock.calls.length

    storeRef.store.dispatch(
      getPosts.initiate(3, {
        subscriptionOptions: {
          pollingInterval: 15,
          skipPollingIfUnfocused: true,
        },
        subscribe: true,
      }),
    )

    storeRef.store.dispatch(
      getPosts.initiate(3, {
        subscriptionOptions: {
          pollingInterval: 20,
          skipPollingIfUnfocused: false,
        },
        subscribe: true,
      }),
    )

    storeRef.store.dispatch(api.internalActions?.onFocusLost())

    await delay(50)
    const callsWithSkip = mockBaseQuery.mock.calls.length

    expect(callsWithoutSkip).toBeGreaterThan(2)
    expect(callsWithSkip).toBeGreaterThan(callsWithoutSkip)
  })

  it('replaces skipPollingIfUnfocused when the subscription options are updated', async () => {
    const { requestId, queryCacheKey, ...subscription } =
      storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: {
            pollingInterval: 10,
            skipPollingIfUnfocused: false,
          },
          subscribe: true,
        }),
      )

    const getSubs = createSubscriptionGetter(queryCacheKey)

    await delay(1)
    expect(getSubs().size).toBe(1)
    expect(getSubs().get(requestId)?.skipPollingIfUnfocused).toBe(false)

    subscription.updateSubscriptionOptions({
      pollingInterval: 20,
      skipPollingIfUnfocused: true,
    })

    await delay(1)
    expect(getSubs().size).toBe(1)
    expect(getSubs().get(requestId)?.skipPollingIfUnfocused).toBe(true)
  })

  it('should minimize polling recalculations when adding multiple subscribers', async () => {
    // Reset any existing state
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const SUBSCRIBER_COUNT = 10
    const subscriptions: QueryActionCreatorResult<any>[] = []

    // Add 10 subscribers to the same endpoint with polling enabled
    for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
      const subscription = storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 1000 },
          subscribe: true,
        }),
      )
      subscriptions.push(subscription)
    }

    // Wait a bit for all subscriptions to be processed
    await Promise.all(subscriptions)

    // Wait for the poll update timer
    await delay(25)

    const queryCacheKey = subscriptions[0].queryCacheKey
    const updateCount =
      getPollUpdateCounters(storeRef.store.dispatch)[queryCacheKey] ?? 0

    // With batching optimization, this should be much lower than SUBSCRIBER_COUNT
    // Ideally 1, but could be slightly higher due to timing
    expect(updateCount).toBeGreaterThanOrEqual(1)
    expect(updateCount).toBeLessThanOrEqual(2)

    // Clean up subscriptions
    subscriptions.forEach((sub) => sub.unsubscribe())
  })

  describe('subscription changes before a due poll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      mockBaseQuery.mockClear()
    })

    afterEach(() => {
      storeRef.store.dispatch(api.util.resetApiState())
      vi.useRealTimers()
    })

    it.each(['unsubscribe', 'disable polling'])(
      'does not refetch after %s before deferred polling cleanup',
      async (change) => {
        const subscription = storeRef.store.dispatch(
          getPosts.initiate(1, {
            subscriptionOptions: { pollingInterval: 30 },
          }),
        )

        // Queue the change before fulfillment schedules the poll at the same time.
        setTimeout(() => {
          if (change === 'unsubscribe') {
            subscription.unsubscribe()
          } else {
            subscription.updateSubscriptionOptions({ pollingInterval: 0 })
          }
        }, 30)
        await subscription

        await vi.advanceTimersByTimeAsync(30)
        expect(mockBaseQuery).toHaveBeenCalledOnce()

        await vi.advanceTimersByTimeAsync(60)
        expect(mockBaseQuery).toHaveBeenCalledOnce()
      },
    )

    it('stops polling while retaining a passive subscriber and its cached data', async () => {
      const pollingSubscription = storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 30 },
        }),
      )
      const passiveSubscription = storeRef.store.dispatch(getPosts.initiate(1))

      setTimeout(() => pollingSubscription.unsubscribe(), 30)
      await Promise.all([pollingSubscription, passiveSubscription])

      await vi.advanceTimersByTimeAsync(30)
      expect(mockBaseQuery).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(60)
      expect(mockBaseQuery).toHaveBeenCalledOnce()
      expect([
        ...getSubscribersForQueryCacheKey(
          passiveSubscription.queryCacheKey,
        ).keys(),
      ]).toEqual([passiveSubscription.requestId])
      expect(getPosts.select(1)(storeRef.store.getState())).toMatchObject({
        status: 'fulfilled',
        data: { url: 'posts', params: 1 },
      })
    })

    it('keeps polling when another subscriber remains', async () => {
      const subscription = storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 30 },
        }),
      )
      storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 30 },
        }),
      )

      setTimeout(() => subscription.unsubscribe(), 30)
      await subscription

      await vi.advanceTimersByTimeAsync(30)
      expect(mockBaseQuery).toHaveBeenCalledTimes(2)
      expect(
        getSubscribersForQueryCacheKey(subscription.queryCacheKey).size,
      ).toBe(1)

      await vi.advanceTimersByTimeAsync(30)
      expect(mockBaseQuery).toHaveBeenCalledTimes(3)
    })

    it('keeps polling when the last subscriber is replaced before the poll fires', async () => {
      const subscription = storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 30 },
        }),
      )

      setTimeout(() => {
        subscription.unsubscribe()
        storeRef.store.dispatch(
          getPosts.initiate(1, {
            subscriptionOptions: { pollingInterval: 30 },
          }),
        )
      }, 30)
      await subscription

      await vi.advanceTimersByTimeAsync(30)
      expect(mockBaseQuery).toHaveBeenCalledTimes(2)
      expect(
        getSubscribersForQueryCacheKey(subscription.queryCacheKey).size,
      ).toBe(1)

      await vi.advanceTimersByTimeAsync(30)
      expect(mockBaseQuery).toHaveBeenCalledTimes(3)
    })

    it('does not abort an in-flight request when the last subscriber leaves', async () => {
      mockBaseQuery.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: 1 }), 50)
          }),
      )
      const subscription = storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 30 },
        }),
      )

      subscription.unsubscribe()
      await vi.advanceTimersByTimeAsync(30)
      expect(getPosts.select(1)(storeRef.store.getState()).status).toBe(
        'pending',
      )

      await vi.advanceTimersByTimeAsync(20)
      await expect(subscription.unwrap()).resolves.toBe(1)

      await vi.advanceTimersByTimeAsync(60)
      expect(mockBaseQuery).toHaveBeenCalledOnce()
    })
  })
})

describe('poll scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const makePollApi = () => {
    const requests: string[] = []
    let gate: PromiseWithResolvers<void> | undefined

    const api = createApi({
      baseQuery: async (arg: string) => {
        requests.push(arg)
        if (gate) await gate.promise
        return { data: `data-${arg}-${requests.length}` }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })

    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      { withoutTestLifecycles: true },
    )

    const blockRequests = () => {
      gate = Promise.withResolvers<void>()
    }
    const releaseRequests = () => {
      gate?.resolve()
      gate = undefined
    }

    return {
      api,
      store: storeRef.store,
      requests,
      blockRequests,
      releaseRequests,
    }
  }

  it('pollingInterval: 0 disables polling', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 0 },
      }),
    )
    await vi.advanceTimersByTimeAsync(100)

    expect(requests).toEqual(['a'])

    subscription.unsubscribe()
  })

  it('a duplicate dispatch for a fulfilled entry does not reset the poll timer', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 200 },
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(requests).toEqual(['a'])

    await store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    expect(requests).toEqual(['a'])

    // The poll still fires 200ms after the first request, not 200ms after the duplicate
    await vi.advanceTimersByTimeAsync(120)
    expect(requests).toEqual(['a', 'a'])

    subscription.unsubscribe()
  })

  it('skips polls while a polled request is still pending', async () => {
    const { api, store, requests, blockRequests, releaseRequests } =
      makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 20 },
      }),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(requests).toEqual(['a'])

    blockRequests()
    await vi.advanceTimersByTimeAsync(70)
    expect(requests).toEqual(['a', 'a'])
    const dedupedPolls = store
      .getState()
      .actions.filter(api.endpoints.getThing.matchRejected)
      .filter((action) => action.meta.condition)
    expect(dedupedPolls).toHaveLength(0)
    const currentPolls = store.dispatch({
      type: `${api.reducerPath}/getPolling`,
    }) as unknown as Map<string, unknown>
    expect(currentPolls.has(subscription.queryCacheKey)).toBe(false)

    releaseRequests()
    await vi.advanceTimersByTimeAsync(0)
    expect(requests).toEqual(['a', 'a'])

    // The settled request starts the next poll
    await vi.advanceTimersByTimeAsync(20)
    expect(requests).toEqual(['a', 'a', 'a'])

    subscription.unsubscribe()
  })

  it('reads skipPollingIfUnfocused when the poll fires', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 20 },
      }),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(requests).toEqual(['a'])

    subscription.updateSubscriptionOptions({
      pollingInterval: 20,
      skipPollingIfUnfocused: true,
    })
    store.dispatch(api.internalActions.onFocusLost())

    await vi.advanceTimersByTimeAsync(25)
    expect(requests).toEqual(['a'])

    subscription.unsubscribe()
  })

  it('clamps a pollingInterval larger than the maximum timer delay', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 2 ** 31 },
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(requests).toEqual(['a'])
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('larger than the maximum timer delay'),
    )

    subscription.unsubscribe()
    warnSpy.mockRestore()
  })

  it('removes the poll record when polling stops', async () => {
    const { api, store } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 20 },
      }),
    )
    await vi.advanceTimersByTimeAsync(0)

    const getPolls = () =>
      store.dispatch({
        type: `${api.reducerPath}/getPolling`,
      }) as unknown as Map<string, unknown>

    expect(getPolls().has(subscription.queryCacheKey)).toBe(true)

    subscription.updateSubscriptionOptions({ pollingInterval: 0 })
    await subscription.refetch()

    expect(getPolls().has(subscription.queryCacheKey)).toBe(false)

    subscription.unsubscribe()
  })

  it('a slower polling interval pushes back the pending poll', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 50 },
      }),
    )
    await vi.advanceTimersByTimeAsync(10)
    expect(requests).toEqual(['a'])

    subscription.updateSubscriptionOptions({ pollingInterval: 200 })

    // The new interval counts from the start of the current wait, so the
    // old 50ms poll does not fire and the next one is due at 200ms
    await vi.advanceTimersByTimeAsync(189)
    expect(requests).toEqual(['a'])

    await vi.advanceTimersByTimeAsync(1)
    expect(requests).toEqual(['a', 'a'])

    subscription.unsubscribe()
  })

  it('a faster polling interval keeps an earlier existing deadline', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 200 },
      }),
    )
    await vi.advanceTimersByTimeAsync(180)
    expect(requests).toEqual(['a'])

    // Restarting at 50ms would push the poll to 230ms
    subscription.updateSubscriptionOptions({ pollingInterval: 50 })

    await vi.advanceTimersByTimeAsync(19)
    expect(requests).toEqual(['a'])

    await vi.advanceTimersByTimeAsync(1)
    expect(requests).toEqual(['a', 'a'])

    subscription.unsubscribe()
  })

  it('a faster polling interval restarts the poll when that is sooner', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 200 },
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(requests).toEqual(['a'])

    subscription.updateSubscriptionOptions({ pollingInterval: 50 })

    await vi.advanceTimersByTimeAsync(45)
    expect(requests).toEqual(['a'])

    await vi.advanceTimersByTimeAsync(10)
    expect(requests).toEqual(['a', 'a'])

    subscription.unsubscribe()
  })

  it('removing the cache entry stops its poll', async () => {
    const { api, store, requests } = makePollApi()

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 50 },
      }),
    )
    await vi.advanceTimersByTimeAsync(10)

    const getPolls = () =>
      store.dispatch({
        type: `${api.reducerPath}/getPolling`,
      }) as unknown as Map<string, unknown>

    expect(getPolls().has(subscription.queryCacheKey)).toBe(true)

    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: subscription.queryCacheKey as QueryCacheKey,
      }),
    )

    expect(getPolls().has(subscription.queryCacheKey)).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(requests).toEqual(['a'])

    subscription.unsubscribe()
  })

  it('regaining focus does not trigger a catch-up poll', async () => {
    const { api, store, requests } = makePollApi()

    store.dispatch(api.internalActions.onFocusLost())

    const subscription = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: {
          pollingInterval: 40,
          skipPollingIfUnfocused: true,
        },
      }),
    )
    await vi.advanceTimersByTimeAsync(120)
    expect(requests).toEqual(['a'])

    store.dispatch(api.internalActions.onFocus())
    await vi.advanceTimersByTimeAsync(5)
    expect(requests).toEqual(['a'])

    // The next poll arrives on the normal interval
    await vi.advanceTimersByTimeAsync(40)
    expect(requests).toEqual(['a', 'a'])

    subscription.unsubscribe()
  })

  describe('pollingInterval as a function', () => {
    it('is called with the settled cache entry once per scheduled poll', async () => {
      const { api, store, requests } = makePollApi()
      const pollingInterval = vi.fn<Exclude<PollingInterval, number>>(
        (entry) => (entry.data === 'data-a-3' ? 0 : 20),
      )

      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval },
        }),
      )
      await vi.advanceTimersByTimeAsync(200)

      expect(requests).toEqual(['a', 'a', 'a'])
      expect(pollingInterval).toHaveBeenCalledTimes(3)
      for (const [entry] of pollingInterval.mock.calls) {
        expect(entry).toMatchObject({
          status: 'fulfilled',
          queryCacheKey: subscription.queryCacheKey,
          endpointName: 'getThing',
        })
      }

      subscription.unsubscribe()
    })

    it('resumes polling when a later request makes it return an interval again', async () => {
      const { api, store, requests } = makePollApi()
      let enabled = false

      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: () => (enabled ? 20 : 0) },
        }),
      )
      await vi.advanceTimersByTimeAsync(100)
      expect(requests).toEqual(['a'])

      enabled = true
      await subscription.refetch()
      expect(requests).toEqual(['a', 'a'])

      await vi.advanceTimersByTimeAsync(25)
      expect(requests).toEqual(['a', 'a', 'a'])

      subscription.unsubscribe()
    })

    it('is not called while the entry is pending', async () => {
      const { api, store, requests, blockRequests, releaseRequests } =
        makePollApi()
      const pollingInterval = vi.fn<Exclude<PollingInterval, number>>(() => 20)

      blockRequests()
      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval },
        }),
      )
      await vi.advanceTimersByTimeAsync(100)
      expect(requests).toEqual(['a'])
      expect(pollingInterval).not.toHaveBeenCalled()

      releaseRequests()
      await vi.advanceTimersByTimeAsync(0)
      expect(pollingInterval).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(20)
      expect(requests).toEqual(['a', 'a'])

      subscription.unsubscribe()
    })

    it('uses the lowest interval across number and function subscribers', async () => {
      const { api, store, requests } = makePollApi()

      const slow = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: 100 },
        }),
      )
      const fast = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: () => 30 },
        }),
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(requests).toEqual(['a'])

      await vi.advanceTimersByTimeAsync(30)
      expect(requests).toEqual(['a', 'a'])

      fast.unsubscribe()
      await vi.advanceTimersByTimeAsync(60)
      expect(requests).toEqual(['a', 'a'])

      await vi.advanceTimersByTimeAsync(50)
      expect(requests).toEqual(['a', 'a', 'a'])

      slow.unsubscribe()
    })

    it.each([
      ['a negative number', () => -5],
      ['NaN', () => Number.NaN],
      ['a non-number', () => undefined as unknown as number],
    ])('treats %s as no poll', async (_, pollingInterval) => {
      const { api, store, requests } = makePollApi()

      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval },
        }),
      )
      await vi.advanceTimersByTimeAsync(100)
      expect(requests).toEqual(['a'])

      subscription.unsubscribe()
    })

    it('treats a negative number interval as no poll', async () => {
      const { api, store, requests } = makePollApi()

      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: -5 },
        }),
      )
      await vi.advanceTimersByTimeAsync(100)
      expect(requests).toEqual(['a'])

      subscription.unsubscribe()
    })

    it('treats a throwing function as no poll without breaking other polls', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { api, store, requests } = makePollApi()
      const throwing = () => {
        throw new Error('boom')
      }

      const a = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: throwing },
        }),
      )
      await expect(a).resolves.toMatchObject({ data: 'data-a-1' })
      expect(errorSpy).toHaveBeenCalledOnce()

      const b = store.dispatch(
        api.endpoints.getThing.initiate('b', {
          subscriptionOptions: { pollingInterval: 0 },
        }),
      )
      await vi.advanceTimersByTimeAsync(0)

      // Throws inside the batched update for 'a'
      a.updateSubscriptionOptions({ pollingInterval: () => throwing() })
      await vi.advanceTimersByTimeAsync(0)
      expect(errorSpy).toHaveBeenCalledTimes(2)

      b.updateSubscriptionOptions({ pollingInterval: 20 })
      await vi.advanceTimersByTimeAsync(25)
      expect(requests).toEqual(['a', 'b', 'b'])

      a.unsubscribe()
      b.unsubscribe()
      errorSpy.mockRestore()
    })

    it('ignores skipPollingIfUnfocused from a function whose last result stopped polling', async () => {
      const { api, store, requests } = makePollApi()

      const polling = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: 20 },
        }),
      )
      const stopped = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: {
            pollingInterval: () => 0,
            skipPollingIfUnfocused: true,
          },
        }),
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(requests).toEqual(['a'])

      store.dispatch(api.internalActions.onFocusLost())
      await vi.advanceTimersByTimeAsync(25)
      expect(requests).toEqual(['a', 'a'])

      polling.unsubscribe()
      stopped.unsubscribe()
    })

    it('does not trigger serializability warnings', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const api = createApi({
        baseQuery: (arg: string) => ({ data: arg }),
        endpoints: (build) => ({
          getThing: build.query<string, string>({ query: (arg) => arg }),
        }),
      })
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (gdm) => gdm().concat(api.middleware),
      })

      const subscription = store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { pollingInterval: () => 20 },
        }),
      )
      await vi.advanceTimersByTimeAsync(0)
      subscription.updateSubscriptionOptions({ pollingInterval: () => 30 })
      await vi.advanceTimersByTimeAsync(600)

      expect(errorSpy).not.toHaveBeenCalled()
      expect(
        store.getState().api.subscriptions[subscription.queryCacheKey],
      ).toEqual({ [subscription.requestId]: {} })

      subscription.unsubscribe()
      errorSpy.mockRestore()
    })
  })
})
