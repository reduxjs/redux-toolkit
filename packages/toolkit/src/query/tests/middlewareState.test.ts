import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

const createTestApi = () => {
  const countsSeenInQueryFn: number[] = []
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getValue: build.query<number, number>({
        queryFn: async (arg, { dispatch, queryCacheKey }) => {
          const middlewareState = dispatch(api.util.getMiddlewareState())
          countsSeenInQueryFn.push(
            middlewareState?.getSubscriptionCount(queryCacheKey!) ?? -1,
          )
          return { data: arg }
        },
      }),
    }),
  })
  return { api, countsSeenInQueryFn }
}

type TestApi = ReturnType<typeof createTestApi>['api']

const createStore = (api: TestApi, withMiddleware = true) =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) =>
      withMiddleware ? gdm().concat(api.middleware) : gdm(),
  })

describe('getMiddlewareState', () => {
  test('returns undefined for a store without the api middleware', () => {
    const { api } = createTestApi()
    const store = createStore(api, false)
    expect(store.dispatch(api.util.getMiddlewareState())).toBeUndefined()
  })

  test('counts subscriptions per store', async () => {
    const { api } = createTestApi()
    const storeA = createStore(api)
    const storeB = createStore(api)
    const stateA = storeA.dispatch(api.util.getMiddlewareState())!
    const stateB = storeB.dispatch(api.util.getMiddlewareState())!

    expect(stateA.getSubscriptionCount('getValue(1)')).toBe(0)

    const first = storeA.dispatch(api.endpoints.getValue.initiate(1))
    const second = storeA.dispatch(api.endpoints.getValue.initiate(1))
    await first

    expect(stateA.getSubscriptionCount('getValue(1)')).toBe(2)
    expect(stateB.getSubscriptionCount('getValue(1)')).toBe(0)

    first.unsubscribe()
    expect(stateA.getSubscriptionCount('getValue(1)')).toBe(1)
    second.unsubscribe()
    expect(stateA.getSubscriptionCount('getValue(1)')).toBe(0)
  })

  test('is usable from inside a queryFn', async () => {
    const { api, countsSeenInQueryFn } = createTestApi()
    const store = createStore(api)

    await store.dispatch(api.endpoints.getValue.initiate(1))
    await store.dispatch(
      api.endpoints.getValue.initiate(2, { subscribe: false }),
    )

    expect(countsSeenInQueryFn).toEqual([1, 0])
  })
})

describe('isSubscribed', () => {
  test('tracks the subscription of a single initiate() result', async () => {
    const { api } = createTestApi()
    const store = createStore(api)

    const first = store.dispatch(api.endpoints.getValue.initiate(1))
    const second = store.dispatch(api.endpoints.getValue.initiate(1))
    expect(first.isSubscribed()).toBe(true)
    await first
    expect(first.isSubscribed()).toBe(true)

    first.unsubscribe()
    expect(first.isSubscribed()).toBe(false)
    expect(second.isSubscribed()).toBe(true)
  })

  test('is false for subscribe: false', async () => {
    const { api } = createTestApi()
    const store = createStore(api)

    const promise = store.dispatch(
      api.endpoints.getValue.initiate(1, { subscribe: false }),
    )
    expect(promise.isSubscribed()).toBe(false)
    await promise
    expect(promise.isSubscribed()).toBe(false)
  })

  test('is false after resetApiState', async () => {
    const { api } = createTestApi()
    const store = createStore(api)

    const promise = store.dispatch(api.endpoints.getValue.initiate(1))
    await promise
    store.dispatch(api.util.resetApiState())
    expect(promise.isSubscribed()).toBe(false)
  })
})

describe('internal_getRTKQSubscriptions probe', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    consoleWarnSpy.mockClear()
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
  })

  test('still answers with subscription selectors and warns once per api', async () => {
    const { api } = createTestApi()
    const store = createStore(api)

    const promise = store.dispatch(api.endpoints.getValue.initiate(1))
    await promise

    const probe = () =>
      store.dispatch(
        api.internalActions.internal_getRTKQSubscriptions(),
      ) as unknown as SubscriptionSelectors

    const selectors = probe()
    expect(selectors.getSubscriptionCount('getValue(1)')).toBe(1)
    expect(
      selectors.isRequestSubscribed('getValue(1)', promise.requestId),
    ).toBe(true)
    expect(selectors.getSubscriptions().get('getValue(1)')?.size).toBe(1)

    probe()
    expect(consoleWarnSpy).toHaveBeenCalledOnce()
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(
      /internal_getRTKQSubscriptions.*deprecated/,
    )
  })

  test('hooks-free usage of initiate does not warn', async () => {
    const { api } = createTestApi()
    const store = createStore(api)

    const promise = store.dispatch(api.endpoints.getValue.initiate(1))
    await promise
    promise.isSubscribed()
    store.dispatch(api.util.getMiddlewareState())

    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })
})
