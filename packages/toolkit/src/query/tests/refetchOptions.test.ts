import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query'

type RefetchDefaults = {
  refetchOnMountOrArgChange?: boolean | number
  refetchOnFocus?: boolean
  refetchOnReconnect?: boolean
}

const cleanups: Array<() => void> = []

function makeApi(defaults: RefetchDefaults = {}) {
  const baseQuery = vi.fn(async (arg: string) => ({ data: arg }))
  const api = createApi({
    baseQuery,
    endpoints: (build) => ({
      getThing: build.query<string, string>({ query: (arg) => arg }),
    }),
    ...defaults,
  })
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  })
  cleanups.push(() => store.dispatch(api.util.resetApiState()))
  return { api, store, baseQuery }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('refetch option composition', () => {
  test.each([
    { value: false, calls: 1 },
    { value: 0, calls: 2 },
    { value: 60, calls: 1 },
    { value: true, calls: 2 },
  ])('forceRefetch $value makes $calls requests', async ({ value, calls }) => {
    const { api, store, baseQuery } = makeApi()
    await store.dispatch(api.endpoints.getThing.initiate('a'))
    await store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscribe: false,
        forceRefetch: value,
      }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(calls)
  })

  test.each([
    { value: false, calls: 1 },
    { value: 0, calls: 2 },
    { value: 60, calls: 1 },
    { value: true, calls: 2 },
  ])(
    'refetchOnMountOrArgChange $value makes $calls requests',
    async ({ value, calls }) => {
      const { api, store, baseQuery } = makeApi({
        refetchOnMountOrArgChange: value,
      })
      await store.dispatch(api.endpoints.getThing.initiate('a'))
      await store.dispatch(api.endpoints.getThing.initiate('a'))
      expect(baseQuery).toHaveBeenCalledTimes(calls)
    },
  )

  test('explicit false overrides a numeric zero mount default', async () => {
    const { api, store, baseQuery } = makeApi({
      refetchOnMountOrArgChange: 0,
    })
    await store.dispatch(api.endpoints.getThing.initiate('a'))
    await store.dispatch(
      api.endpoints.getThing.initiate('a', { forceRefetch: false }),
    )
    expect(baseQuery).toHaveBeenCalledOnce()
  })

  test('deprecated ifOlderThan zero preserves a populated cache entry', async () => {
    const { api, store, baseQuery } = makeApi()
    await store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(api.util.prefetch('getThing', 'a', { ifOlderThan: 0 }))
    await vi.advanceTimersByTimeAsync(0)
    expect(baseQuery).toHaveBeenCalledOnce()
  })

  describe.each([
    { option: 'refetchOnFocus', event: 'onFocus' },
    { option: 'refetchOnReconnect', event: 'onOnline' },
  ] as const)('$option', ({ option, event }) => {
    test.each([
      { defaultValue: true, first: false, second: undefined, calls: 2 },
      { defaultValue: true, first: undefined, second: false, calls: 2 },
      { defaultValue: true, first: false, second: false, calls: 1 },
      { defaultValue: false, first: false, second: true, calls: 2 },
      { defaultValue: false, first: undefined, second: undefined, calls: 1 },
    ])(
      'resolves subscribers $first/$second against default $defaultValue',
      async ({ defaultValue, first, second, calls }) => {
        const { api, store, baseQuery } = makeApi({ [option]: defaultValue })
        await store.dispatch(
          api.endpoints.getThing.initiate('a', {
            subscriptionOptions: { [option]: first },
          }),
        )
        await store.dispatch(
          api.endpoints.getThing.initiate('a', {
            subscriptionOptions: { [option]: second },
          }),
        )
        expect(baseQuery).toHaveBeenCalledOnce()
        store.dispatch(api.internalActions[event]())
        await vi.advanceTimersByTimeAsync(0)
        expect(baseQuery).toHaveBeenCalledTimes(calls)
      },
    )

    test('stops inheriting the default when its subscriber leaves', async () => {
      const { api, store, baseQuery } = makeApi({ [option]: true })
      await store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: { [option]: false },
        }),
      )
      const inherited = store.dispatch(api.endpoints.getThing.initiate('a'))
      await inherited
      inherited.unsubscribe()
      store.dispatch(api.internalActions[event]())
      await vi.advanceTimersByTimeAsync(0)
      expect(baseQuery).toHaveBeenCalledOnce()
    })
  })

  test.each([
    { first: false, second: true, calls: 2 },
    { first: undefined, second: true, calls: 2 },
    { first: true, second: false, calls: 2 },
    { first: true, second: true, calls: 1 },
  ])(
    'combines unfocused polling preferences $first/$second',
    async ({ first, second, calls }) => {
      const { api, store, baseQuery } = makeApi()
      await store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: {
            pollingInterval: 100,
            skipPollingIfUnfocused: first,
          },
        }),
      )
      await store.dispatch(
        api.endpoints.getThing.initiate('a', {
          subscriptionOptions: {
            pollingInterval: 200,
            skipPollingIfUnfocused: second,
          },
        }),
      )
      store.dispatch(api.internalActions.onFocusLost())
      await vi.advanceTimersByTimeAsync(110)
      expect(baseQuery).toHaveBeenCalledTimes(calls)
    },
  )

  test('non-polling subscribers do not prevent skipping unfocused polls', async () => {
    const { api, store, baseQuery } = makeApi()
    await store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: {
          pollingInterval: 100,
          skipPollingIfUnfocused: true,
        },
      }),
    )
    await store.dispatch(api.endpoints.getThing.initiate('a'))
    store.dispatch(api.internalActions.onFocusLost())
    await vi.advanceTimersByTimeAsync(110)
    expect(baseQuery).toHaveBeenCalledOnce()
  })

  test('re-evaluates unfocused polling after unsubscribe and option changes', async () => {
    const { api, store, baseQuery } = makeApi()
    const skipping = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: {
          pollingInterval: 100,
          skipPollingIfUnfocused: true,
        },
      }),
    )
    await skipping
    const continuing = store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 100 },
      }),
    )
    await continuing
    store.dispatch(api.internalActions.onFocusLost())
    await vi.advanceTimersByTimeAsync(110)
    expect(baseQuery).toHaveBeenCalledTimes(2)

    continuing.unsubscribe()
    await vi.advanceTimersByTimeAsync(110)
    expect(baseQuery).toHaveBeenCalledTimes(2)

    skipping.updateSubscriptionOptions({
      pollingInterval: 100,
      skipPollingIfUnfocused: false,
    })
    await vi.advanceTimersByTimeAsync(110)
    expect(baseQuery).toHaveBeenCalledTimes(3)
  })
})
