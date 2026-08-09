/**
 * Tests that name and assert the documented behavioral invariants of RTK Query's
 * query lifecycle & cache management slice.
 *
 * Every test name starts with the invariant ID(s) from
 * `dev-plans/redux/rtk/features/2026-07-rtk3-research/2026-07-26-invariants-query-lifecycle.md`
 * so a grep for `INV-Q-0NN` finds both the catalog entry and its assertion.
 *
 * These tests assert what the code does TODAY. Where current behavior looks wrong,
 * it is marked with a `SUSPECTED BUG` comment rather than "fixed" in the assertion.
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import { configureStore, createAction } from '@reduxjs/toolkit'
import type { BaseQueryFn, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import {
  createApi,
  fakeBaseQuery,
  retry,
  skipToken,
} from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'
import type { QueryCacheKey } from '../core/apiState'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

/** The cache-key branding is internal; tests only ever have plain strings. */
const asCacheKey = (key: string) => key as QueryCacheKey

type AnyApi = {
  internalActions: { internal_getRTKQSubscriptions: () => UnknownAction }
}

const getSubscriptionSelectors = (
  api: AnyApi,
  dispatch: (action: UnknownAction) => unknown,
) =>
  dispatch(
    api.internalActions.internal_getRTKQSubscriptions(),
  ) as unknown as SubscriptionSelectors

const countSubscribers = (
  api: AnyApi,
  dispatch: (action: UnknownAction) => unknown,
  queryCacheKey: string,
) =>
  getSubscriptionSelectors(api, dispatch).getSubscriptionCount(
    asCacheKey(queryCacheKey),
  )

describe('Initiation & promise semantics (INV-Q-001..020)', () => {
  const baseQuery = vi.fn(async (arg: string) => {
    await delay(1)
    return { data: `data-${arg}` }
  })

  const api = createApi({
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

  const storeRef = setupApiStore(api, { ...actionsReducer })

  beforeEach(() => {
    baseQuery.mockClear()
  })

  // INV-Q-001: `subscribe` defaults to `true`, so `initiate(arg)` with no options object
  //            registers a subscription.
  // INV-Q-011: `unsubscribe()` closes over the `subscribe` flag captured at creation, so
  //            it is a silent no-op for a `subscribe: false` promise.
  it('INV-Q-001, INV-Q-011: initiate defaults to subscribe: true, and unsubscribe() is a silent no-op for subscribe: false', async () => {
    const { store } = storeRef

    const subscribed = store.dispatch(api.endpoints.getThing.initiate('a'))
    await subscribed
    expect(
      countSubscribers(api, store.dispatch, subscribed.queryCacheKey),
    ).toBe(1)

    const unsubscribed = store.dispatch(
      api.endpoints.getThing.initiate('b', { subscribe: false }),
    )
    await unsubscribed
    expect(
      countSubscribers(api, store.dispatch, unsubscribed.queryCacheKey),
    ).toBe(0)

    // Calling `unsubscribe()` on the non-subscribing promise dispatches nothing and throws nothing
    const actionsBefore = store.getState().actions.length
    expect(() => unsubscribed.unsubscribe()).not.toThrow()
    expect(store.getState().actions.length).toBe(actionsBefore)

    subscribed.unsubscribe()
    expect(
      countSubscribers(api, store.dispatch, subscribed.queryCacheKey),
    ).toBe(0)
  })

  // INV-Q-003: `skippedSynchronously` is derived as `stateAfter.requestId !== requestId`,
  //            which is exactly the set of dispatches the thunk `condition` rejected.
  it('INV-Q-003: a condition-rejected dispatch is exactly the case where the store requestId differs from the promise requestId', async () => {
    const { store } = storeRef

    const first = store.dispatch(api.endpoints.getThing.initiate('cond'))
    await first

    // `subscribe: false` so the rejected action is not swallowed by the middleware's
    // "additional subscription" gate (see INV-Q-029)
    const cacheHit = store.dispatch(
      api.endpoints.getThing.initiate('cond', { subscribe: false }),
    )
    await cacheHit

    const entry = store.getState().api.queries[cacheHit.queryCacheKey]!
    // The second dispatch never reached the reducers, so the stored requestId is still the first one
    expect(entry.requestId).toBe(first.requestId)
    expect(entry.requestId).not.toBe(cacheHit.requestId)

    const rejected = (store.getState().actions as UnknownAction[]).filter(
      (action) =>
        action.type === 'api/executeQuery/rejected' &&
        (action.meta as { requestId: string }).requestId === cacheHit.requestId,
    )
    expect(rejected).toHaveLength(1)
    expect((rejected[0].meta as { condition: boolean }).condition).toBe(true)

    first.unsubscribe()
    cacheHit.unsubscribe()
  })

  // INV-Q-008: `abort()` rejects the underlying thunk, but the returned promise resolves
  //            with the resulting (error) cache state instead of rejecting.
  // INV-Q-115: after an abort the entry is `rejected` with `meta.aborted` and an
  //            `AbortError`, previously fulfilled data is retained, and a later dispatch
  //            is not blocked.
  it('INV-Q-008, INV-Q-115: an aborted query resolves with the rejected cache state, keeps prior data, and does not block later dispatches', async () => {
    const { store } = storeRef

    const first = store.dispatch(api.endpoints.getThing.initiate('abort-me'))
    await first
    expect(first.queryCacheKey in store.getState().api.queries).toBe(true)

    const refetching = first.refetch()
    refetching.abort()

    const resolved = await refetching
    expect(resolved.isError).toBe(true)
    expect(resolved.status).toBe('rejected')
    // Previously fulfilled data is retained on the entry
    expect(resolved.data).toBe('data-abort-me')

    const entry = store.getState().api.queries[first.queryCacheKey]!
    expect(entry.status).toBe('rejected')
    expect(entry.data).toBe('data-abort-me')
    expect((entry.error as { name?: string }).name).toBe('AbortError')

    const abortedAction = (store.getState().actions as UnknownAction[]).find(
      (action) =>
        action.type === 'api/executeQuery/rejected' &&
        (action.meta as { requestId: string }).requestId ===
          refetching.requestId,
    )
    expect((abortedAction?.meta as { aborted: boolean }).aborted).toBe(true)

    // A subsequent forced dispatch is not blocked by the aborted one
    baseQuery.mockClear()
    const after = first.refetch()
    await after
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(store.getState().api.queries[first.queryCacheKey]!.status).toBe(
      'fulfilled',
    )

    first.unsubscribe()
  })

  // INV-Q-009: `unwrap()` is an `async` function awaiting `statePromise`, so it settles a
  //            microtask later, and it throws the serialized error stored on the cache entry
  //            rather than the raw thrown value.
  it('INV-Q-009: unwrap() settles strictly after the state promise and throws the serialized cache-entry error', async () => {
    const { store } = storeRef

    const promise = store.dispatch(api.endpoints.getThing.initiate('unwrap'))
    const order: string[] = []
    const unwrapped = promise.unwrap().then(() => {
      order.push('unwrap')
    })
    const stated = promise.then(() => {
      order.push('statePromise')
    })
    await Promise.all([unwrapped, stated])
    expect(order).toEqual(['statePromise', 'unwrap'])
    promise.unsubscribe()

    const failing = store.dispatch(api.endpoints.failing.initiate('nope'))
    await failing
    const entryError =
      store.getState().api.queries[failing.queryCacheKey]!.error
    await expect(failing.unwrap()).rejects.toEqual(entryError)
    failing.unsubscribe()
  })

  // INV-Q-010: `refetch(options)` re-dispatches `initiate` with
  //            `{ subscribe: false, forceRefetch: true, ...options }`, so it never adds a
  //            subscription of its own.
  it('INV-Q-010: refetch() forces a request without adding a subscription', async () => {
    const { store } = storeRef

    const promise = store.dispatch(api.endpoints.getThing.initiate('refetch'))
    await promise
    expect(countSubscribers(api, store.dispatch, promise.queryCacheKey)).toBe(1)

    baseQuery.mockClear()
    await promise.refetch()

    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(countSubscribers(api, store.dispatch, promise.queryCacheKey)).toBe(1)

    promise.unsubscribe()
    expect(countSubscribers(api, store.dispatch, promise.queryCacheKey)).toBe(0)
  })

  // INV-Q-013: an upsert takes the `forceQueryFn` branch, which is explicitly excluded
  //            from the `runningQueries` registry.
  // INV-Q-004: the upsert promise resolves via `thunkResult.then(selectFromState)`, i.e.
  //            only after the store has been written.
  it('INV-Q-004, INV-Q-013: an upsert resolves with the written data and is never registered in runningQueries', async () => {
    const { store } = storeRef

    const upsert = store.dispatch(
      api.util.upsertQueryData('getThing', 'upserted', 'from-upsert'),
    )

    expect(store.dispatch(api.util.getRunningQueriesThunk())).toHaveLength(0)

    await upsert

    const entry = api.endpoints.getThing.select('upserted')(store.getState())
    expect(entry.originalArgs).toBe('upserted')
    expect(entry.data).toBe('from-upsert')
    expect(entry.status).toBe('fulfilled')
  })

  // INV-Q-014: the registry entry is deleted in a `.then()` on the state promise, so it is
  //            still present in the same tick the promise resolves and gone one microtask later.
  it('INV-Q-014: a runningQueries entry outlives its promise by one microtask', async () => {
    const { store } = storeRef

    const promise = store.dispatch(api.endpoints.getThing.initiate('running'))
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toHaveLength(1)

    await promise
    // The store already says fulfilled, but the registry cleanup `.then` may not have run yet
    expect(store.getState().api.queries[promise.queryCacheKey]!.status).toBe(
      'fulfilled',
    )

    await Promise.resolve()
    await Promise.resolve()
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toHaveLength(0)

    promise.unsubscribe()
  })

  // INV-Q-017: `subscribe: false` only suppresses subscription bookkeeping. The request
  //            still runs through the full fulfilled path, including tag provision.
  it('INV-Q-017: a subscribe: false query still writes its provided tags', async () => {
    const { store } = storeRef

    const promise = store.dispatch(
      api.endpoints.getThing.initiate('tags', { subscribe: false }),
    )
    await promise

    const provided = store.getState().api.provided
    expect(provided.keys[asCacheKey(promise.queryCacheKey)]).toEqual([
      { type: 'Thing', id: undefined },
    ])
    expect(provided.tags.Thing?.['__internal_without_id']).toContain(
      promise.queryCacheKey,
    )
  })
})

describe('Dedup & `condition` gate (INV-Q-021..030)', () => {
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

  const api = createApi({
    baseQuery,
    endpoints: (build) => ({
      getThing: build.query<string, string>({ query: (arg) => arg }),
      withForceCallback: build.query<string, string>({
        query: (arg) => arg,
        // Wrapped rather than passed directly so the callback's parameter is
        // contextually typed by RTKQ instead of having to restate `RootState`.
        forceRefetch: (params) => forceRefetchCallback(params),
      }),
    }),
  })

  const storeRef = setupApiStore(api, { ...actionsReducer })

  beforeEach(() => {
    baseQuery.mockClear()
    forceRefetchCallback.mockClear()
    forceRefetchCallback.mockReturnValue(false)
    forcedValues.length = 0
    resolveGate = undefined
  })

  // INV-Q-021: the in-flight guard (`requestState?.status === 'pending'`) sits ABOVE every
  //            force check, so `forceRefetch: true` during a pending request is deduplicated
  //            onto the running request rather than starting a second one.
  it('INV-Q-021: forceRefetch: true while a request is pending is deduplicated onto the running request', async () => {
    const { store } = storeRef

    const first = store.dispatch(api.endpoints.getThing.initiate('gated'))
    await delay(1)
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const forced = store.dispatch(
      api.endpoints.getThing.initiate('gated', {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    await delay(1)
    // No second request was started
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(forced.requestId).not.toBe(first.requestId)

    resolveGate!()
    const [firstResult, forcedResult] = await Promise.all([first, forced])
    expect(firstResult.data).toBe('data-gated')
    // The deduplicated promise resolves with the same cache state
    expect(forcedResult.data).toBe('data-gated')
    expect(baseQuery).toHaveBeenCalledTimes(1)

    first.unsubscribe()
  })

  // INV-Q-024: a numeric `forceRefetch` is an age threshold in SECONDS compared against
  //            `fulfilledTimeStamp`, not a boolean and not milliseconds.
  it('INV-Q-024: a numeric forceRefetch is an age threshold in seconds against fulfilledTimeStamp', async () => {
    const { store } = storeRef

    const first = store.dispatch(api.endpoints.getThing.initiate('age'))
    await first
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // 10 seconds have not elapsed -> the cache hit wins
    await store.dispatch(
      api.endpoints.getThing.initiate('age', {
        subscribe: false,
        forceRefetch: 10,
      }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // Move the wall clock forward 11 seconds. If the threshold were milliseconds, the
    // 10ms-old entry above would already have refetched.
    try {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(Date.now() + 11_000)

      await store.dispatch(
        api.endpoints.getThing.initiate('age', {
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

  // INV-Q-025: on the very first fetch there is no `fulfilledTimeStamp`, so a numeric
  //            threshold compares against `NaN` and evaluates false. The request still runs
  //            (it falls through to the "no cached value" branch), but `forced` handed to the
  //            base query is `false` -- unlike `forceRefetch: true`, which yields `true`.
  it('INV-Q-025: a numeric force threshold yields forced === false on the first fetch, while forceRefetch: true yields true', async () => {
    const { store } = storeRef

    await store.dispatch(
      api.endpoints.getThing.initiate('numeric-first', {
        subscribe: false,
        forceRefetch: 10,
      }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(forcedValues).toEqual([false])

    await store.dispatch(
      api.endpoints.getThing.initiate('bool-first', {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    expect(forcedValues).toEqual([false, true])
  })

  // INV-Q-026: `forced` is recomputed by `isForcedQuery` at execution time rather than
  //            carried over from the `condition` decision.
  // INV-Q-027: the endpoint-level `forceRefetch` callback runs after the global force check
  //            and before the cache-hit check, and receives
  //            `{ currentArg, previousArg, endpointState, state }`.
  it('INV-Q-026, INV-Q-027: the endpoint forceRefetch callback can let a request through while `forced` is still false', async () => {
    const { store } = storeRef

    const first = store.dispatch(
      api.endpoints.withForceCallback.initiate('cb', { subscribe: false }),
    )
    await first
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(forcedValues).toEqual([false])

    forceRefetchCallback.mockClear()
    forceRefetchCallback.mockReturnValue(true)

    await store.dispatch(
      api.endpoints.withForceCallback.initiate('cb', { subscribe: false }),
    )

    // The callback ran, and it ran with the documented argument shape
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

    // The request ran because of the callback...
    expect(baseQuery).toHaveBeenCalledTimes(2)
    // ...but `forced` is recomputed from `isForcedQuery`, which knows nothing about the
    // endpoint-level callback, so it is still false.
    expect(forcedValues).toEqual([false, false])
  })

  // INV-Q-028: a condition rejection is a real `rejected` action with `meta.condition: true`.
  //            Reducers ignore it, so no error state is written.
  // INV-Q-029: with `subscribe: true` the middleware still registers the subscription from
  //            that rejected action, and then suppresses the action so it never reaches the
  //            reducers at all.
  it('INV-Q-028, INV-Q-029: a condition-rejected subscribing dispatch registers a subscription and is withheld from the reducers', async () => {
    const { store } = storeRef

    const first = store.dispatch(api.endpoints.getThing.initiate('dedup'))
    await first
    const key = first.queryCacheKey
    expect(countSubscribers(api, store.dispatch, key)).toBe(1)

    const beforeActions = (store.getState().actions as UnknownAction[]).length

    const second = store.dispatch(api.endpoints.getThing.initiate('dedup'))
    await second

    // The subscription was registered even though the thunk bailed out
    expect(countSubscribers(api, store.dispatch, key)).toBe(2)

    // ...and the rejected action was withheld from the reducers entirely
    const newActions = (store.getState().actions as UnknownAction[]).slice(
      beforeActions,
    )
    expect(
      newActions.filter((a) => a.type === 'api/executeQuery/rejected'),
    ).toEqual([])

    // No error state was written
    const entry = store.getState().api.queries[key]!
    expect(entry.status).toBe('fulfilled')
    expect(entry.error).toBeUndefined()

    first.unsubscribe()
    second.unsubscribe()
  })

  it('INV-Q-023: a subscribe: false dispatch ignores a global refetchOnMountOrArgChange', async () => {
    const requests: string[] = []
    const localApi = createApi({
      reducerPath: 'api',
      refetchOnMountOrArgChange: true,
      baseQuery: async (arg: string) => {
        requests.push(arg)
        return { data: arg }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })
    const localStore = setupApiStore(localApi, undefined, {
      withoutTestLifecycles: true,
    })

    const first = localStore.store.dispatch(
      localApi.endpoints.getThing.initiate('a'),
    )
    await first
    expect(requests).toEqual(['a'])

    // `isForcedQuery` computes `arg.forceRefetch ?? (arg.subscribe && globalFlag)`,
    // so an unsubscribed dispatch never inherits the global force flag.
    await localStore.store.dispatch(
      localApi.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    expect(requests).toEqual(['a'])

    const third = localStore.store.dispatch(
      localApi.endpoints.getThing.initiate('a'),
    )
    await third
    expect(requests).toEqual(['a', 'a'])

    first.unsubscribe()
    third.unsubscribe()
  })
})

describe('Reducer transitions & selectors (INV-Q-031..043)', () => {
  const serializeSpy = vi.fn(({ queryArgs }: { queryArgs: string }) =>
    JSON.stringify(queryArgs),
  )

  const api = createApi({
    baseQuery: async (arg: { delayMs: number; value: string }) => {
      await delay(arg.delayMs)
      return { data: arg.value }
    },
    tagTypes: ['Thing'],
    endpoints: (build) => ({
      getThing: build.query<string, { delayMs: number; value: string }>({
        query: (arg) => arg,
      }),
      custom: build.query<string, string>({
        query: (arg) => ({ delayMs: 1, value: arg }),
        serializeQueryArgs: serializeSpy,
      }),
      throwing: build.query<string, string>({
        queryFn: async () => {
          throw new Error('thrown from queryFn')
        },
        providesTags: ['Thing'],
      }),
      returningError: build.query<string, string>({
        queryFn: async () => ({
          error: { status: 400, data: 'returned' } as FetchBaseQueryError,
        }),
        providesTags: ['Thing'],
      }),
    }),
  })

  const storeRef = setupApiStore(api, { ...actionsReducer })

  beforeEach(() => {
    serializeSpy.mockClear()
  })

  // INV-Q-031: `writePendingCacheEntry` creates the entry with status `uninitialized` and
  //            immediately overwrites it with `pending` inside the SAME reducer pass, so no
  //            store subscriber can ever observe the intermediate state.
  it('INV-Q-031: no store subscriber ever observes the uninitialized status of a newly created entry', async () => {
    const { store } = storeRef
    const arg = { delayMs: 1, value: 'transitions' }

    // Learn the cache key, then wipe the entry so the next dispatch creates it from scratch
    const probe = store.dispatch(
      api.endpoints.getThing.initiate(arg, { subscribe: false }),
    )
    const key = probe.queryCacheKey
    await probe
    store.dispatch(
      api.internalActions.removeQueryResult({ queryCacheKey: asCacheKey(key) }),
    )
    expect(store.getState().api.queries[key]).toBeUndefined()

    // Read the raw entry, not the selector: for a missing entry the selector falls back to
    // the frozen default sub-state, which also reports `uninitialized` (INV-Q-039).
    const statuses: Array<string | undefined> = []
    const unsubscribeStore = store.subscribe(() => {
      statuses.push(store.getState().api.queries[key]?.status)
    })

    const promise = store.dispatch(api.endpoints.getThing.initiate(arg))
    await promise
    unsubscribeStore()

    // The entry is never observed carrying the `uninitialized` status it briefly held
    // inside the pending reducer.
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses).not.toContain('uninitialized')
    expect(statuses.at(-1)).toBe('fulfilled')
    expect(store.getState().api.queries[key]!.status).toBe('fulfilled')

    promise.unsubscribe()
  })

  // INV-Q-032: `writeFulfilledCacheEntry` bails out when `substate.requestId !== meta.requestId`,
  //            so a late response from a request the entry no longer tracks is silently dropped.
  //
  // SUSPECTED BUG (INV-Q-061): `queryFulfilled` still RESOLVES for that discarded response.
  // The lifecycle map is keyed by `requestId` and resolved unconditionally in the middleware,
  // completely independently of the reducer's staleness guard. So `onQueryStarted` is told the
  // request succeeded with data that never entered the cache. Asserting current behavior to
  // lock the baseline.
  it('INV-Q-032, INV-Q-061: a stale response is discarded by the reducer, yet queryFulfilled still resolves with it', async () => {
    const fulfilledWith: unknown[] = []
    const localApi = createApi({
      reducerPath: 'stale',
      baseQuery: async (arg: { delayMs: number; value: string }) => {
        await delay(arg.delayMs)
        return { data: arg.value }
      },
      endpoints: (build) => ({
        getThing: build.query<string, { delayMs: number; value: string }>({
          query: (arg) => arg,
          async onQueryStarted(_arg, { queryFulfilled }) {
            const result = await queryFulfilled
            fulfilledWith.push(result.data)
          },
        }),
      }),
    })

    const store = configureStore({
      reducer: { [localApi.reducerPath]: localApi.reducer },
      middleware: (gdm) => gdm().concat(localApi.middleware),
    })

    const slow = store.dispatch(
      localApi.endpoints.getThing.initiate({ delayMs: 50, value: 'slow' }),
    )
    const key = slow.queryCacheKey

    // Drop the entry, then start a fresh, faster request for the same cache key. The new
    // request writes a new `requestId`, orphaning the slow one.
    store.dispatch(
      localApi.internalActions.removeQueryResult({
        queryCacheKey: asCacheKey(key),
      }),
    )
    const fast = store.dispatch(
      localApi.endpoints.getThing.initiate({ delayMs: 50, value: 'slow' }),
    )
    expect(fast.requestId).not.toBe(slow.requestId)

    await Promise.all([slow, fast])
    await delay(10)

    // The reducer kept the tracked request's result and discarded the orphan's
    expect(store.getState().stale.queries[key]!.requestId).toBe(fast.requestId)
    expect(store.getState().stale.queries[key]!.status).toBe('fulfilled')

    // ...but BOTH requests' `queryFulfilled` promises resolved
    expect(fulfilledWith).toEqual(['slow', 'slow'])
    expect(fulfilledWith).toHaveLength(2)

    slow.unsubscribe()
    fast.unsubscribe()
  })

  // INV-Q-036: the core selector result carries exactly four boolean flags. There is no core
  //            `isFetching`; `isLoading` is `status === 'pending'`, so it is true on every
  //            pending action including refetches of already-cached data.
  it('INV-Q-036: core query selectors expose only isUninitialized/isLoading/isSuccess/isError, and isLoading is true on refetches', async () => {
    const { store } = storeRef
    const arg = { delayMs: 5, value: 'flags' }
    const select = api.endpoints.getThing.select(arg)

    expect(Object.keys(select(store.getState())).sort()).toEqual([
      'isError',
      'isLoading',
      'isSuccess',
      'isUninitialized',
      'status',
    ])
    expect(select(store.getState())).toMatchObject({
      isUninitialized: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })

    const promise = store.dispatch(api.endpoints.getThing.initiate(arg))
    expect(select(store.getState())).toMatchObject({
      isUninitialized: false,
      isLoading: true,
    })
    await promise
    expect(select(store.getState())).toMatchObject({
      isLoading: false,
      isSuccess: true,
    })

    // A refetch of already-cached data flips `isLoading` back on -- there is no separate
    // `isFetching` at the core level to distinguish "first load" from "refetching"
    const refetching = promise.refetch()
    const duringRefetch = select(store.getState())
    expect(duringRefetch.isLoading).toBe(true)
    expect(duringRefetch.data).toBe('flags')
    expect('isFetching' in duringRefetch).toBe(false)
    await refetching

    promise.unsubscribe()
  })

  // INV-Q-038: `skipToken` short-circuits before `serializeQueryArgs` is ever called, and
  //            resolves to the shared module-level frozen default sub-state.
  // INV-Q-039: any unknown or garbage-collected cache key falls back to that same default
  //            sub-state -- there is no tombstone distinguishing "never existed" from "collected".
  it('INV-Q-038, INV-Q-039: skipToken bypasses serializeQueryArgs, and unknown/collected keys fall back to the same default sub-state', async () => {
    const { store } = storeRef

    const skipped = api.endpoints.custom.select(skipToken)
    expect(serializeSpy).not.toHaveBeenCalled()

    api.endpoints.custom.select('real')
    expect(serializeSpy).toHaveBeenCalledTimes(1)

    const skippedResult = skipped(store.getState())
    const neverExisted = api.endpoints.custom.select('never-existed')(
      store.getState(),
    )
    expect(skippedResult).toEqual(neverExisted)
    expect(skippedResult).toMatchObject({
      status: 'uninitialized',
      isUninitialized: true,
    })
    // The default sub-state has no `data` key at all -- not `data: undefined`
    expect('data' in skippedResult).toBe(false)

    // Referentially stable across unrelated state changes
    expect(skipped(store.getState())).toBe(skippedResult)

    // A collected entry is indistinguishable from one that never existed
    const promise = store.dispatch(
      api.endpoints.custom.initiate('collected', { subscribe: false }),
    )
    await promise
    const collectedSelect = api.endpoints.custom.select('collected')
    expect(collectedSelect(store.getState()).status).toBe('fulfilled')
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: asCacheKey(promise.queryCacheKey),
      }),
    )
    expect(collectedSelect(store.getState())).toEqual(neverExisted)
  })

  // INV-Q-042 / INV-Q-116: the tag-writing matcher is
  //            `isAnyOf(isFulfilled(queryThunk), isRejectedWithValue(queryThunk))`. A thrown
  //            error is a PLAIN rejection, so it provides zero tags. A returned `{ error }` is
  //            `rejectedWithValue`, so it still writes its `providesTags`.
  //            NOTE: the catalog frames this as "error => zero tags", which is only true for
  //            the thrown path. The returned-error path does provide tags.
  // INV-Q-062: the rejection reason handed to `queryFulfilled` carries
  //            `isUnhandledError: !rejectedWithValue`: `false` for a returned `{ error }`,
  //            `true` for a thrown error.
  it('INV-Q-042, INV-Q-062, INV-Q-116: a thrown error provides zero tags and is flagged isUnhandledError, while a returned error still provides tags', async () => {
    const rejections: Array<{ isUnhandledError: boolean }> = []
    const localApi = createApi({
      reducerPath: 'errs',
      baseQuery: async () => ({ data: null }),
      tagTypes: ['Thing'],
      endpoints: (build) => ({
        thrown: build.query<string, string>({
          queryFn: async () => {
            throw new Error('thrown from queryFn')
          },
          providesTags: ['Thing'],
          async onQueryStarted(_arg, { queryFulfilled }) {
            try {
              await queryFulfilled
            } catch (e) {
              rejections.push(e as { isUnhandledError: boolean })
            }
          },
        }),
        returned: build.query<string, string>({
          queryFn: async () => ({
            error: { status: 400, data: 'returned' } as FetchBaseQueryError,
          }),
          providesTags: ['Thing'],
          async onQueryStarted(_arg, { queryFulfilled }) {
            try {
              await queryFulfilled
            } catch (e) {
              rejections.push(e as { isUnhandledError: boolean })
            }
          },
        }),
        ok: build.query<string, string>({
          queryFn: async () => ({ data: 'ok' }),
          providesTags: ['Thing'],
        }),
      }),
    })

    const store = configureStore({
      reducer: { [localApi.reducerPath]: localApi.reducer },
      middleware: (gdm) => gdm().concat(localApi.middleware),
    })

    const thrown = store.dispatch(
      localApi.endpoints.thrown.initiate('a', { subscribe: false }),
    )
    await thrown
    const returned = store.dispatch(
      localApi.endpoints.returned.initiate('b', { subscribe: false }),
    )
    await returned
    const ok = store.dispatch(
      localApi.endpoints.ok.initiate('c', { subscribe: false }),
    )
    await ok
    await delay(1)

    const { provided } = store.getState().errs

    // A fulfilled response registers its tags
    expect(provided.keys[asCacheKey(ok.queryCacheKey)]).toEqual([
      { type: 'Thing' },
    ])
    // A thrown error is a plain rejection -> zero tags
    expect(provided.keys[asCacheKey(thrown.queryCacheKey)]).toBeUndefined()
    // A returned `{ error }` is `rejectedWithValue` -> tags ARE still written
    expect(provided.keys[asCacheKey(returned.queryCacheKey)]).toEqual([
      { type: 'Thing' },
    ])
    expect(provided.tags.Thing?.['__internal_without_id']).toEqual([
      returned.queryCacheKey,
      ok.queryCacheKey,
    ])

    // The two error paths differ only in the `isUnhandledError` flag
    expect(rejections.map((r) => r.isUnhandledError)).toEqual([true, false])
  })
})

describe('onCacheEntryAdded (INV-Q-049..058)', () => {
  it('INV-Q-055: an upserted cache entry starts a lifecycle and resolves cacheDataLoaded with a literal empty meta', async () => {
    const loaded: unknown[] = []

    const api = createApi({
      baseQuery: async () => ({ data: 'from-baseQuery' }),
      endpoints: (build) => ({
        getThing: build.query<string, string>({
          query: (arg) => arg,
          async onCacheEntryAdded(arg, { cacheDataLoaded }) {
            loaded.push(await cacheDataLoaded)
          },
        }),
      }),
    })

    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    storeRef.store.dispatch(
      api.util.upsertQueryEntries([
        { endpointName: 'getThing', arg: 'a', value: 'upserted-value' },
      ]),
    )

    await delay(5)

    expect(loaded).toEqual([{ data: 'upserted-value', meta: {} }])
    // The meta is a fresh empty object, not the baseQuery meta, and has no keys
    expect(Object.keys((loaded[0] as { meta: object }).meta)).toHaveLength(0)
  })

  it('INV-Q-056: an endpoint without onCacheEntryAdded produces no lifecycle side effects across add/remove', async () => {
    // Only weakly observable from the outside: `handleNewKey` bails out before
    // allocating anything, so the sole assertable consequence is that adding and
    // removing a cache entry emits no extra actions and never throws.
    const api = createApi({
      baseQuery: async () => ({ data: 1 }),
      endpoints: (build) => ({
        getThing: build.query<number, string>({ query: (arg) => arg }),
      }),
    })

    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await promise
    promise.unsubscribe()
    storeRef.store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: asCacheKey(promise.queryCacheKey),
      }),
    )
    await delay(5)

    const types = storeRef.store
      .getState()
      .actions.map((a: UnknownAction) => a.type)
      .filter((type: string) => type.startsWith('api/'))

    // Note: `unsubscribeQueryResult` is withheld from the reducers by the
    // batched-actions handler, so it never appears in the log.
    expect(types).toEqual([
      'api/config/middlewareRegistered',
      'api/executeQuery/pending',
      'api/executeQuery/fulfilled',
      'api/queries/removeQueryResult',
    ])
  })
})

describe('onQueryStarted / queryFulfilled (INV-Q-059..064)', () => {
  it('INV-Q-063: queryFulfilled is pre-caught internally, so ignoring a rejection produces no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason)
      event.preventDefault()
    }
    window.addEventListener('unhandledrejection', onUnhandled)

    const erroringBaseQuery: BaseQueryFn = async () => ({
      error: { status: 500, data: 'boom' } as FetchBaseQueryError,
    })

    try {
      const api = createApi({
        baseQuery: erroringBaseQuery,
        endpoints: (build) => ({
          getThing: build.query<number, string>({
            query: (arg) => arg,
            // Deliberately never awaits or catches `queryFulfilled`
            onQueryStarted() {},
          }),
        }),
      })

      const storeRef = setupApiStore(api, undefined, {
        withoutTestLifecycles: true,
      })

      await storeRef.store.dispatch(api.endpoints.getThing.initiate('a'))
      await delay(10)

      expect(unhandled).toEqual([])
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandled)
    }
  })
})

describe('Cache collection / GC (INV-Q-065..071)', () => {
  const rehydrate = createAction<{ api: unknown }>('rehydrate')

  const makeGcApi = (options: { blockForever?: boolean } = {}) => {
    const aborted: string[] = []

    const api = createApi({
      baseQuery: async (arg: string, { signal }) => {
        if (options.blockForever) {
          await new Promise<void>((resolve) => {
            signal.addEventListener('abort', () => {
              aborted.push(arg)
              resolve()
            })
          })
          return { error: { status: 'CUSTOM_ERROR', error: 'aborted' } }
        }
        return { data: `data-${arg}` }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
      extractRehydrationInfo(action, { reducerPath }) {
        if (rehydrate.match(action)) {
          // Double cast: the rehydration payload is an opaque snapshot here.
          return (action.payload as unknown as Record<string, never>)[
            reducerPath
          ]
        }
        return undefined
      },
    })

    return { api, aborted }
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('INV-Q-065: a fulfilled query with zero subscribers arms the removal timer immediately', async () => {
    const { api } = makeGcApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    // `subscribe: false` means the entry is already unsubscribed when it settles
    await storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )

    const key = 'getThing("a")'
    expect(storeRef.store.getState().api.queries[key]?.data).toBe('data-a')

    // Default `keepUnusedDataFor` is 60 seconds, measured from the fulfilled action
    await vi.advanceTimersByTimeAsync(59_000)
    expect(storeRef.store.getState().api.queries[key]).toBeTruthy()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()
  })

  it('INV-Q-069: the removal timer re-checks subscriptions when it fires, and a later unsubscribe restarts the full countdown', async () => {
    const { api } = makeGcApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const first = storeRef.store.dispatch(api.endpoints.getThing.initiate('a'))
    await first
    first.unsubscribe()

    await vi.advanceTimersByTimeAsync(30_000)

    // Re-subscribing inside the window does not clear the pending timer, but
    // when the timer fires it re-reads the subscription map and bails out.
    const second = storeRef.store.dispatch(api.endpoints.getThing.initiate('a'))
    await second

    await vi.advanceTimersByTimeAsync(31_000)
    expect(storeRef.store.getState().api.queries[key]).toBeTruthy()

    // A new zero-subscriber event arms a fresh 60s countdown rather than
    // continuing (or accumulating on top of) the earlier one.
    second.unsubscribe()
    await vi.advanceTimersByTimeAsync(59_000)
    expect(storeRef.store.getState().api.queries[key]).toBeTruthy()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()
  })

  it('INV-Q-070: when the removal timer fires it aborts a still-running query before removing the entry', async () => {
    const { api, aborted } = makeGcApi({ blockForever: true })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await vi.advanceTimersByTimeAsync(1)
    expect(storeRef.store.getState().api.queries[key]?.status).toBe('pending')

    // Unsubscribing while the request is still in flight arms the timer
    promise.unsubscribe()
    await vi.advanceTimersByTimeAsync(61_000)

    expect(aborted).toEqual(['a'])
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()
  })

  it('INV-Q-041: rehydrated cache entries immediately enter GC as if they had just been unsubscribed', async () => {
    const { api } = makeGcApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    // Build a snapshot in a throwaway store so that the rehydrating store has
    // never dispatched a request of its own.
    const donor = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    await donor.store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    const snapshot = donor.store.getState().api

    storeRef.store.dispatch(rehydrate({ api: snapshot }))
    expect(storeRef.store.getState().api.queries[key]?.data).toBe('data-a')

    // No request was ever made in this store, and there are no subscribers,
    // so the rehydrated entry is collected on the normal schedule.
    await vi.advanceTimersByTimeAsync(59_000)
    expect(storeRef.store.getState().api.queries[key]).toBeTruthy()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()
  })
})

describe('Polling (INV-Q-072..081)', () => {
  type PollProbe = Map<
    string,
    { nextPollTimestamp: number; pollingInterval: number }
  > & {
    pollUpdateCounters?: Record<string, number>
  }

  const makePollApi = () => {
    const requests: string[] = []
    let gate: Promise<void> | undefined
    let openGate: (() => void) | undefined

    const api = createApi({
      baseQuery: async (arg: string) => {
        requests.push(arg)
        if (gate) await gate
        return { data: `data-${arg}-${requests.length}` }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })

    const blockRequests = () => {
      gate = new Promise<void>((resolve) => {
        openGate = () => {
          gate = undefined
          resolve()
        }
      })
    }

    return { api, requests, blockRequests, release: () => openGate?.() }
  }

  const getPolls = (store: { dispatch: (action: UnknownAction) => unknown }) =>
    store.dispatch({ type: 'api/getPolling' } as UnknownAction) as PollProbe

  it('INV-Q-076: pollingInterval: 0 disables polling entirely rather than scheduling a zero-delay poll chain', async () => {
    // CATALOG CORRECTION (INV-Q-076): the catalog claims 0 is "finite, so a
    // `setTimeout(0)` poll chain", but `findLowestPollingInterval` filters with
    // `if (!!entry.pollingInterval)`, so 0 is falsy and skipped entirely, leaving
    // `lowestPollingInterval` at Infinity and `startNextPoll` bailing out.
    const { api, requests } = makePollApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 0 },
      }),
    )
    await promise
    await delay(60)

    expect(requests).toEqual(['a'])
    expect(getPolls(storeRef.store).get('getThing("a")')).toBeUndefined()

    promise.unsubscribe()
  })

  it('INV-Q-030: a condition-rejected dispatch schedules a polling recalculation but never calls startNextPoll', async () => {
    const { api, requests, blockRequests, release } = makePollApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const subscription = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 5_000 },
      }),
    )
    await subscription
    await delay(10)

    const pollBefore = { ...getPolls(storeRef.store).get(key)! }
    const countersBefore =
      getPolls(storeRef.store).pollUpdateCounters?.[key] ?? 0

    // A plain duplicate dispatch is condition-rejected because the cache entry
    // is already fulfilled.
    blockRequests()
    await storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    release()
    await delay(10)

    const polls = getPolls(storeRef.store)
    expect(polls.pollUpdateCounters?.[key]).toBeGreaterThan(countersBefore)
    // `startNextPoll` was never called, so the scheduled timestamp is untouched
    expect(polls.get(key)!.nextPollTimestamp).toBe(pollBefore.nextPollTimestamp)
    expect(requests).toEqual(['a'])

    subscription.unsubscribe()
  })

  it('INV-Q-074: a condition-rejected poll refetch does not stop the poll chain, because the poll callback re-arms unconditionally', async () => {
    // CATALOG CORRECTION (INV-Q-074): the catalog flags this as "a plausible
    // latent bug" on the grounds that condition rejections are excluded from
    // `startNextPoll`. They are — but the poll timeout callback itself calls
    // `startNextPoll` right after dispatching the refetch, regardless of how that
    // dispatch resolved, so the chain survives.
    const { api, requests, blockRequests, release } = makePollApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const subscription = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { pollingInterval: 20 },
      }),
    )
    await subscription

    // Block the next request so that the poll after it is condition-rejected
    // for hitting an already-pending entry.
    blockRequests()
    await delay(70)

    const requestsWhileBlocked = requests.length
    expect(requestsWhileBlocked).toBeGreaterThanOrEqual(2)
    // The poll entry is still armed even though at least one poll was rejected
    expect(getPolls(storeRef.store).get(key)).toBeTruthy()

    release()
    await delay(70)

    expect(requests.length).toBeGreaterThan(requestsWhileBlocked)

    subscription.unsubscribe()
  })

  it('INV-Q-080: skipPollingIfUnfocused reads the focus flag from the state snapshot captured when the poll was scheduled', async () => {
    // CATALOG CORRECTION (INV-Q-080): the catalog says `state.config.focused` is
    // read at timer-fire time. In fact `startNextPoll` captures
    // `api.getState()[reducerPath]` when scheduling, and the timeout callback
    // reads `state.config.focused` off that immutable snapshot. So losing focus
    // after the poll is scheduled does NOT suppress that already-scheduled poll;
    // it only suppresses the following one.
    const { api, requests } = makePollApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const subscription = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: {
          pollingInterval: 40,
          skipPollingIfUnfocused: true,
        },
      }),
    )
    await subscription
    expect(storeRef.store.getState().api.config.focused).toBe(true)

    // Lose focus immediately after the first poll was scheduled
    storeRef.store.dispatch(api.internalActions.onFocusLost())
    await delay(60)

    // The already-scheduled poll still fired against the stale snapshot
    expect(requests.length).toBe(2)

    // The re-arm at the end of that callback used fresh state, so subsequent
    // polls are suppressed while unfocused.
    await delay(120)
    expect(requests.length).toBe(2)

    subscription.unsubscribe()
  })

  it('INV-Q-079: regaining focus does not trigger a catch-up poll; the chain resumes on its normal schedule', async () => {
    const { api, requests } = makePollApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    storeRef.store.dispatch(api.internalActions.onFocusLost())

    const subscription = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: {
          pollingInterval: 40,
          skipPollingIfUnfocused: true,
        },
      }),
    )
    await subscription
    await delay(120)

    // Only the initial fetch happened; every poll was skipped while unfocused
    expect(requests).toEqual(['a'])

    storeRef.store.dispatch(api.internalActions.onFocus())
    // No immediate catch-up request is issued by the polling handler
    await delay(5)
    expect(requests).toEqual(['a'])

    // The next poll arrives on the normal interval instead
    await delay(80)
    expect(requests.length).toBeGreaterThan(1)

    subscription.unsubscribe()
  })
})

describe('Refetch triggers & subscription bookkeeping (INV-Q-082..090)', () => {
  const rehydrateFocus = createAction<{ api: unknown }>('rehydrateFocus')

  const makeFocusApi = (
    apiOptions: { refetchOnFocus?: boolean; refetchOnReconnect?: boolean } = {},
  ) => {
    const requests: string[] = []

    const api = createApi({
      baseQuery: async (arg: string) => {
        requests.push(arg)
        return { data: `data-${arg}-${requests.length}` }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
      extractRehydrationInfo(action, { reducerPath }) {
        if (rehydrateFocus.match(action)) {
          // Double cast: the rehydration payload is an opaque snapshot here.
          return (action.payload as unknown as Record<string, never>)[
            reducerPath
          ]
        }
        return undefined
      },
      ...apiOptions,
    })

    return { api, requests }
  }

  it('INV-Q-087: config.focused and config.online are seeded from the DOM when the store is created, before any listener setup', () => {
    const onLineSpy = vi
      .spyOn(navigator, 'onLine', 'get')
      .mockReturnValue(false)
    const visibilitySpy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')

    try {
      const { api } = makeFocusApi()
      const storeRef = setupApiStore(api, undefined, {
        withoutTestLifecycles: true,
      })

      expect(storeRef.store.getState().api.config.online).toBe(false)
      expect(storeRef.store.getState().api.config.focused).toBe(false)
    } finally {
      onLineSpy.mockRestore()
      visibilitySpy.mockRestore()
    }
  })

  it('INV-Q-089: dispatching internal_getRTKQSubscriptions returns the live selectors object and never reaches the reducers', async () => {
    const { api } = makeFocusApi()
    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const selectors = getSubscriptionSelectors(api, storeRef.store.dispatch)

    expect(typeof selectors.getSubscriptions).toBe('function')
    expect(typeof selectors.getSubscriptionCount).toBe('function')
    expect(typeof selectors.isRequestSubscribed).toBe('function')

    // Calling it twice returns the same live object
    expect(getSubscriptionSelectors(api, storeRef.store.dispatch)).toBe(
      selectors,
    )

    const types = storeRef.store
      .getState()
      .actions.map((a: UnknownAction) => a.type)
    expect(
      types.some((type: string) =>
        type.includes('internal_getRTKQSubscriptions'),
      ),
    ).toBe(false)

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    // The returned object reflects state at call time, not at dispatch time
    expect(selectors.getSubscriptionCount('getThing("a")')).toBe(1)
    expect(
      selectors.isRequestSubscribed('getThing("a")', promise.requestId),
    ).toBe(true)
    await promise
    promise.unsubscribe()
  })

  it('INV-Q-088: subscription state in Redux lags the middleware map by up to the 500ms sync throttle', async () => {
    const { api } = makeFocusApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await promise

    // The middleware `Map` is authoritative and updated synchronously
    expect(countSubscribers(api, storeRef.store.dispatch, key)).toBe(1)
    // The display-only Redux copy has not been written yet
    expect(storeRef.store.getState().api.subscriptions[key]).toBeUndefined()

    await delay(600)
    expect(
      Object.keys(storeRef.store.getState().api.subscriptions[key] ?? {}),
    ).toEqual([promise.requestId])

    promise.unsubscribe()
  })

  it('INV-Q-082, INV-Q-086: a focus refetch reads the middleware map, so a sub-500ms subscriber is refetched by a non-api-slice action', async () => {
    const { api, requests } = makeFocusApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { refetchOnFocus: true },
      }),
    )
    await promise

    // Still inside the 500ms throttle window: Redux knows nothing about this
    // subscriber, but the middleware map does.
    expect(storeRef.store.getState().api.subscriptions[key]).toBeUndefined()

    const focusAction = api.internalActions.onFocus()
    // The window-event handler runs outside the `isThisApiSliceAction` gate,
    // which is why an action with a non-api-slice type can reach it at all.
    expect(focusAction.type.startsWith('api/')).toBe(false)
    storeRef.store.dispatch(focusAction)
    await delay(10)

    expect(requests).toEqual(['a', 'a'])

    promise.unsubscribe()
  })

  it('INV-Q-083: one subscriber opting out of refetchOnFocus disables the global default for every other subscriber of that entry', async () => {
    // SUSPECTED BUG (INV-Q-083): `shouldRefetch` is
    // `values.some((s) => s[type] === true) || (values.every((s) => s[type] === undefined) && state.config[type])`.
    // A single subscriber with an explicit `false` makes the `every(... === undefined)`
    // arm false, so the global default stops applying to the subscribers that
    // never expressed a preference. Asserting current behavior to lock the baseline.
    const { api, requests } = makeFocusApi({ refetchOnFocus: true })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const optedOut = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a', {
        subscriptionOptions: { refetchOnFocus: false },
      }),
    )
    const noOpinion = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await Promise.all([optedOut, noOpinion])
    expect(requests).toEqual(['a'])

    storeRef.store.dispatch(api.internalActions.onFocus())
    await delay(10)

    // No refetch, even though `noOpinion` should have inherited the global `true`
    expect(requests).toEqual(['a'])

    // Removing the opted-out subscriber restores the global default
    optedOut.unsubscribe()
    storeRef.store.dispatch(api.internalActions.onFocus())
    await delay(10)
    expect(requests).toEqual(['a', 'a'])

    noOpinion.unsubscribe()
  })

  it('INV-Q-084: an orphaned cache entry is removed on focus only when the global refetchOnFocus flag is true', async () => {
    // SUSPECTED BUG (INV-Q-084): with zero subscribers, `values` is `[]`, so
    // `.some(...)` is false and `.every(...)` is vacuously true. `shouldRefetch`
    // therefore collapses to `state.config[type]`, which means whether an orphaned
    // entry gets cleaned up depends entirely on the global flag rather than on
    // anything about the entry. Asserting current behavior to lock the baseline.
    const key = 'getThing("a")'

    const globalOff = makeFocusApi({ refetchOnFocus: false })
    const offStore = setupApiStore(globalOff.api, undefined, {
      withoutTestLifecycles: true,
    })
    const offPromise = offStore.store.dispatch(
      globalOff.api.endpoints.getThing.initiate('a'),
    )
    await offPromise
    offPromise.unsubscribe()
    expect(countSubscribers(globalOff.api, offStore.store.dispatch, key)).toBe(
      0,
    )

    offStore.store.dispatch(globalOff.api.internalActions.onFocus())
    await delay(10)
    // Orphan survives
    expect(offStore.store.getState().api.queries[key]).toBeTruthy()

    const globalOn = makeFocusApi({ refetchOnFocus: true })
    const onStore = setupApiStore(globalOn.api, undefined, {
      withoutTestLifecycles: true,
    })
    const onPromise = onStore.store.dispatch(
      globalOn.api.endpoints.getThing.initiate('a'),
    )
    await onPromise
    onPromise.unsubscribe()

    onStore.store.dispatch(globalOn.api.internalActions.onFocus())
    await delay(10)
    // Same orphaned shape, but now removed outright
    expect(onStore.store.getState().api.queries[key]).toBeUndefined()
  })

  it('INV-Q-085: the uninitialized-status skip is unreachable in practice, and a removed entry is skipped because its subscriptions go with it', async () => {
    // CATALOG CORRECTION (INV-Q-085): the `status !== STATUS_UNINITIALIZED` guard
    // in `refetchValidQueries` cannot be reached. `writePendingCacheEntry` moves a
    // newly created entry to `pending` inside the same reducer pass, and the
    // rehydration reducer only writes entries whose status is `fulfilled` or
    // `rejected`, so no observable state ever has a subscribed `uninitialized`
    // entry. What IS reachable is the sibling `!querySubState` skip.
    const { api, requests } = makeFocusApi({ refetchOnFocus: true })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'getThing("a")'

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await promise
    expect(requests).toEqual(['a'])

    // Rehydration refuses to write a non-settled status at all
    storeRef.store.dispatch(
      rehydrateFocus({
        api: {
          ...storeRef.store.getState().api,
          queries: {
            [key]: { status: 'uninitialized', endpointName: 'getThing' },
          },
        },
      }),
    )
    expect(storeRef.store.getState().api.queries[key]?.status).toBe('fulfilled')

    // Dropping the cache entry also drops the subscription map entry, so the
    // `!querySubState` guard is defensive too: the key is simply not iterated.
    storeRef.store.dispatch(
      api.internalActions.removeQueryResult({ queryCacheKey: asCacheKey(key) }),
    )
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()
    expect(countSubscribers(api, storeRef.store.dispatch, key)).toBe(0)

    storeRef.store.dispatch(api.internalActions.onFocus())
    await delay(10)

    // Neither refetched nor re-created
    expect(requests).toEqual(['a'])
    expect(storeRef.store.getState().api.queries[key]).toBeUndefined()

    promise.unsubscribe()
  })

  it('INV-Q-090: prefetch with ifOlderThan dispatches nothing at all when the cached data is still fresh', async () => {
    const { api, requests } = makeFocusApi()
    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await promise
    promise.unsubscribe()

    const actionCountBefore = storeRef.store.getState().actions.length

    storeRef.store.dispatch(
      api.util.prefetch('getThing', 'a', { ifOlderThan: 10 }),
    )
    await delay(10)

    // The fresh-data branch returns without dispatching a thunk at all, so not
    // even a condition-rejected action shows up.
    expect(storeRef.store.getState().actions.length).toBe(actionCountBefore)
    expect(requests).toEqual(['a'])
  })
})

describe('Infinite queries (INV-Q-091..105)', () => {
  type Page = { page: number; hit: number }

  const makeInfiniteApi = (
    options: {
      initialPageParam?: number
      maxPages?: number
      failOnHit?: number
      nextPageParamOverride?: (lastPageParam: number) => number | null
    } = {},
  ) => {
    const { initialPageParam = 0, maxPages, failOnHit } = options
    const requestedParams: number[] = []
    let hit = 0
    const getNextPageParamSpy = vi.fn(
      (lastPage: Page, allPages: Page[], lastPageParam: number) =>
        options.nextPageParamOverride
          ? options.nextPageParamOverride(lastPageParam)
          : lastPageParam + 1,
    )
    const getPreviousPageParamSpy = vi.fn(
      (firstPage: Page, allPages: Page[], firstPageParam: number) =>
        firstPageParam > 0 ? firstPageParam - 1 : undefined,
    )

    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        pages: build.infiniteQuery<Page, string, number>({
          infiniteQueryOptions: {
            initialPageParam,
            maxPages,
            getNextPageParam: getNextPageParamSpy,
            getPreviousPageParam: getPreviousPageParamSpy,
          },
          queryFn({ pageParam }) {
            hit++
            requestedParams.push(pageParam)
            if (failOnHit !== undefined && hit === failOnHit) {
              return { error: { status: 500, data: 'page failed' } }
            }
            return { data: { page: pageParam, hit } }
          },
        }),
        plain: build.query<string, string>({
          queryFn: (arg) => ({ data: arg }),
        }),
      }),
    })

    return {
      api,
      requestedParams,
      getNextPageParamSpy,
      getPreviousPageParamSpy,
      resetHits: () => {
        requestedParams.length = 0
      },
    }
  }

  it('INV-Q-091, INV-Q-094: infinite and standard queries are the same thunk with the same action type, branched only on the endpoint definition', async () => {
    const { api } = makeInfiniteApi()
    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const infinite = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await infinite
    const plain = storeRef.store.dispatch(api.endpoints.plain.initiate('y'))
    await plain

    const types = (storeRef.store.getState().actions as UnknownAction[])
      .map((a) => a.type)
      .filter((type) => type.includes('executeQuery'))

    expect(types).toEqual([
      'api/executeQuery/pending',
      'api/executeQuery/fulfilled',
      'api/executeQuery/pending',
      'api/executeQuery/fulfilled',
    ])

    // The only difference visible in the action stream is the argument shape
    const args = (storeRef.store.getState().actions as UnknownAction[])
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => (a.meta as { arg: { endpointName: string } }).arg)

    expect(args[0].endpointName).toBe('pages')
    expect(args[1].endpointName).toBe('plain')

    infinite.unsubscribe()
    plain.unsubscribe()
  })

  it('INV-Q-092: direction is written onto the shared substate and persists past settle until the next pending action overwrites it', async () => {
    const { api } = makeInfiniteApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first
    // The initial fetch carries no direction
    expect(
      (storeRef.store.getState().api.queries[key] as { direction?: string })
        .direction,
    ).toBeUndefined()

    await first.refetch()
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )

    // Still set after the request settled - nothing clears it on fulfillment
    expect(
      (storeRef.store.getState().api.queries[key] as { direction?: string })
        .direction,
    ).toBe('forward')

    // It is only the next pending action that overwrites the field. A refetch
    // carries `direction: undefined`, which still satisfies `'direction' in arg`,
    // so the value is reset to `undefined` rather than left stale.
    await first.refetch()
    expect(
      (storeRef.store.getState().api.queries[key] as { direction?: string })
        .direction,
    ).toBeUndefined()

    first.unsubscribe()
  })

  it('INV-Q-095: a forced request that also carries a direction is treated as a page fetch, not a from-scratch refetch', async () => {
    const { api, requestedParams } = makeInfiniteApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    expect(requestedParams).toEqual([0, 1])

    // `isForcedQueryNeedingRefetch` is `isForcedQuery(...) && !direction`, so with
    // a direction present the cached pages are used as the starting point instead
    // of `blankData`.
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', {
        direction: 'forward',
        forceRefetch: true,
      }),
    )

    expect(requestedParams).toEqual([0, 1, 2])
    expect(
      (
        storeRef.store.getState().api.queries[key]!.data as {
          pageParams: number[]
        }
      ).pageParams,
    ).toEqual([0, 1, 2])

    first.unsubscribe()
  })

  it('INV-Q-097: a refetch restarts from cachedPageParams[0], which is not necessarily initialPageParam', async () => {
    const { api, requestedParams, resetHits } = makeInfiniteApi({
      initialPageParam: 2,
    })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'backward' }),
    )
    expect(requestedParams).toEqual([2, 1])
    expect(
      (
        storeRef.store.getState().api.queries[key]!.data as {
          pageParams: number[]
        }
      ).pageParams,
    ).toEqual([1, 2])

    resetHits()
    await first.refetch()

    // Starts from 1 (the first cached page param), not from initialPageParam 2
    expect(requestedParams).toEqual([1, 2])

    first.unsubscribe()
  })

  it('INV-Q-098: a mid-sequence page failure rejects the whole refetch and leaves the previously cached pages in place', async () => {
    // The refetch loop awaits each page in turn, so a rejection on page 3 of 3
    // discards the two pages it had already re-fetched: the thunk rejects and the
    // reducer never writes a partial result.
    const { api, requestedParams, resetHits } = makeInfiniteApi({
      failOnHit: 6,
    })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    const cachedBefore = storeRef.store.getState().api.queries[key]!.data as {
      pages: Page[]
      pageParams: number[]
    }
    expect(cachedBefore.pageParams).toEqual([0, 1, 2])

    resetHits()
    const refetchResult = await first.refetch()

    // Hits 4 and 5 succeeded, hit 6 (the third page) failed
    expect(requestedParams).toEqual([0, 1, 2])
    expect(refetchResult.status).toBe('rejected')
    expect(refetchResult.error).toEqual({ status: 500, data: 'page failed' })

    const entry = storeRef.store.getState().api.queries[key]!
    expect(entry.status).toBe('rejected')
    // The old data is retained, and the two freshly fetched pages are discarded
    expect(entry.data).toEqual(cachedBefore)

    first.unsubscribe()
  })

  it('INV-Q-101, INV-Q-102: a null page param no-ops instead of fetching, both mid-refetch-loop and for an end-of-list fetchNextPage', async () => {
    let allowNext = true
    const { api, requestedParams, resetHits } = makeInfiniteApi({
      nextPageParamOverride: (lastPageParam) =>
        allowNext ? lastPageParam + 1 : null,
    })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    expect(requestedParams).toEqual([0, 1, 2])

    // Now the cursor chain ends immediately after the first page
    allowNext = false

    // INV-Q-102: the end-of-list fetch resolves with the current fulfilled state
    // rather than rejecting or erroring
    const endOfList = await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    expect(endOfList.status).toBe('fulfilled')
    expect(endOfList.isSuccess).toBe(true)
    expect(endOfList.error).toBeUndefined()
    expect((endOfList.data as { pageParams: number[] }).pageParams).toEqual([
      0, 1, 2,
    ])

    // INV-Q-101: the refetch loop still runs `totalPages - 1` iterations, but each
    // `fetchPage` with a null param returns the accumulated data untouched, so the
    // refetched entry ends up with fewer pages than were cached.
    resetHits()
    await first.refetch()
    expect(requestedParams).toEqual([0])
    expect(
      (
        storeRef.store.getState().api.queries[key]!.data as {
          pageParams: number[]
        }
      ).pageParams,
    ).toEqual([0])

    first.unsubscribe()
  })

  it('INV-Q-104: hasNextPage/hasPreviousPage are computed at select time, but memoized so repeated selection does not re-run the page-param callbacks', async () => {
    // CATALOG CORRECTION (INV-Q-104): the catalog says the page-param functions are
    // "invoked per-selection rather than memoized". They are invoked at select
    // time rather than stored in state, but the selector is a `createSelector`
    // memoized on the cache entry, so selecting again with unchanged state does
    // NOT re-run them.
    const { api, getNextPageParamSpy, getPreviousPageParamSpy } =
      makeInfiniteApi()
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const first = storeRef.store.dispatch(api.endpoints.pages.initiate('x'))
    await first

    const selector = api.endpoints.pages.select('x')
    getNextPageParamSpy.mockClear()
    getPreviousPageParamSpy.mockClear()

    const a = selector(storeRef.store.getState())
    const nextCallsAfterOne = getNextPageParamSpy.mock.calls.length
    const prevCallsAfterOne = getPreviousPageParamSpy.mock.calls.length
    expect(nextCallsAfterOne).toBeGreaterThan(0)
    expect(prevCallsAfterOne).toBeGreaterThan(0)
    expect(a.hasNextPage).toBe(true)

    // Selecting again with unchanged state reuses the memoized flags
    const b = selector(storeRef.store.getState())
    expect(b).toBe(a)
    expect(getNextPageParamSpy.mock.calls.length).toBe(nextCallsAfterOne)
    expect(getPreviousPageParamSpy.mock.calls.length).toBe(prevCallsAfterOne)

    // A new page changes the cache entry, so the callbacks run again
    await storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    selector(storeRef.store.getState())
    expect(getNextPageParamSpy.mock.calls.length).toBeGreaterThan(
      nextCallsAfterOne,
    )

    first.unsubscribe()
  })

  it('INV-Q-105: upsertQueryData into an infinite query bypasses maxPages trimming', async () => {
    // SUSPECTED BUG (INV-Q-105): the upsert path runs through `fetchPage`, which
    // treats the whole `{ pages, pageParams }` value as a single page. `maxPages`
    // trimming therefore runs on a one-element array and does nothing, and the
    // in-source `HACK` then un-nests `result.data.pages[0]` back out. The upserted
    // value is written verbatim, exceeding `maxPages`.
    const { api } = makeInfiniteApi({ maxPages: 3 })
    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const key = 'pages("x")'

    const fivePages = {
      pages: [0, 1, 2, 3, 4].map((page) => ({ page, hit: page })),
      pageParams: [0, 1, 2, 3, 4],
    }

    await storeRef.store.dispatch(
      api.util.upsertQueryData('pages', 'x', fivePages),
    )

    const data = storeRef.store.getState().api.queries[key]!.data as {
      pages: Page[]
      pageParams: number[]
    }

    // Five pages retained despite `maxPages: 3`
    expect(data.pageParams).toEqual([0, 1, 2, 3, 4])
    expect(data.pages).toHaveLength(5)

    // A normal page fetch does apply the trim, but `addTo` only drops one page per
    // call, so an over-long cache written by an upsert converges slowly rather
    // than snapping back to `maxPages`.
    const promise = storeRef.store.dispatch(
      api.endpoints.pages.initiate('x', { direction: 'forward' }),
    )
    await promise
    expect(
      (
        storeRef.store.getState().api.queries[key]!.data as {
          pageParams: number[]
        }
      ).pageParams,
    ).toEqual([1, 2, 3, 4, 5])

    promise.unsubscribe()
  })
})

describe('Abort & retry (INV-Q-106..116)', () => {
  it('INV-Q-106: a retry sequence emits exactly one pending and one settled action, no matter how many attempts run', async () => {
    let attempts = 0
    const flakyBaseQuery: BaseQueryFn = async () => {
      attempts++
      if (attempts < 3) {
        return { error: { status: 500, data: 'nope' } }
      }
      return { data: 'ok' }
    }
    const api = createApi({
      baseQuery: retry(flakyBaseQuery, {
        maxRetries: 5,
        backoff: async () => {},
      }),
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })
    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const promise = storeRef.store.dispatch(
      api.endpoints.getThing.initiate('a'),
    )
    await promise

    expect(attempts).toBe(3)

    const thunkActions = (storeRef.store.getState().actions as UnknownAction[])
      .map((a) => a.type)
      .filter((type) => type.includes('executeQuery'))

    // Retries live entirely inside the thunk's payload creator
    expect(thunkActions).toEqual([
      'api/executeQuery/pending',
      'api/executeQuery/fulfilled',
    ])

    promise.unsubscribe()
  })

  it('INV-Q-108: the default backoff is `~~((Math.random() + 0.4) * (300 << attempt))`, and the shift wraps at 32 bits', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6)
    vi.useFakeTimers({ shouldAdvanceTime: false })

    try {
      const timestamps: number[] = []
      const failingBaseQuery: BaseQueryFn = async () => {
        timestamps.push(Date.now())
        return { error: { status: 500, data: 'nope' } }
      }
      const api = createApi({
        baseQuery: retry(failingBaseQuery, { maxRetries: 3 }),
        endpoints: (build) => ({
          getThing: build.query<string, string>({ query: (arg) => arg }),
        }),
      })
      const storeRef = setupApiStore(api, undefined, {
        withoutTestLifecycles: true,
      })

      const promise = storeRef.store.dispatch(
        api.endpoints.getThing.initiate('a'),
      )
      // 600 + 1200 + 2400 of backoff, with `Math.random()` pinned so the
      // `(random + 0.4)` jitter factor is exactly 1.0
      await vi.advanceTimersByTimeAsync(5_000)
      await promise

      expect(timestamps).toHaveLength(4)
      const deltas = timestamps
        .slice(1)
        .map((value, index) => value - timestamps[index])
      expect(deltas).toEqual([600, 1200, 2400])

      // The `<<` in the source expression is a 32-bit signed shift, so it wraps.
      // Mirroring the in-source arithmetic (`defaultBackoff` is not exported):
      const backoffFor = (attempt: number) => ~~((0.6 + 0.4) * (300 << attempt))
      expect(backoffFor(29)).toBe(-2_147_483_648)
      expect(backoffFor(30)).toBe(0)
      expect(backoffFor(31)).toBe(0)
      // At 32 the shift count wraps to 0 and the sequence restarts from 300ms
      expect(backoffFor(32)).toBe(300)
      expect(backoffFor(33)).toBe(600)

      promise.unsubscribe()
    } finally {
      vi.useRealTimers()
      randomSpy.mockRestore()
    }
  })

  it('INV-Q-112, INV-Q-042: a retry-wrapped thrown error becomes rejectedWithValue and therefore provides tags, while an unwrapped throw does not', async () => {
    const throwingBaseQuery: BaseQueryFn = async () => {
      throw new Error('kaboom')
    }

    const plainApi = createApi({
      reducerPath: 'api',
      tagTypes: ['Thing'],
      baseQuery: throwingBaseQuery,
      endpoints: (build) => ({
        getThing: build.query<string, string>({
          query: (arg) => arg,
          providesTags: ['Thing'],
        }),
      }),
    })
    const plainStore = setupApiStore(
      plainApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const plainPromise = plainStore.store.dispatch(
      plainApi.endpoints.getThing.initiate('a'),
    )
    await plainPromise

    const plainRejected = (
      plainStore.store.getState().actions as UnknownAction[]
    ).find((a) => a.type === 'api/executeQuery/rejected')!
    // A raw throw propagates as a plain rejection: no payload
    expect((plainRejected as { payload?: unknown }).payload).toBeUndefined()
    expect(
      plainStore.store.getState().api.provided.keys[
        asCacheKey(plainPromise.queryCacheKey)
      ],
    ).toBeUndefined()

    const retryApi = createApi({
      reducerPath: 'api',
      tagTypes: ['Thing'],
      baseQuery: retry(throwingBaseQuery, {
        maxRetries: 1,
        backoff: async () => {},
      }),
      endpoints: (build) => ({
        getThing: build.query<string, string>({
          query: (arg) => arg,
          providesTags: ['Thing'],
        }),
      }),
    })
    const retryStore = setupApiStore(
      retryApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const retryPromise = retryStore.store.dispatch(
      retryApi.endpoints.getThing.initiate('a'),
    )
    await retryPromise

    const retryRejected = (
      retryStore.store.getState().actions as UnknownAction[]
    ).find((a) => a.type === 'api/executeQuery/rejected')!
    // `retry` converts an unexpected throw into `{ error: e }`, which the thunk
    // turns into a `rejectedWithValue` action...
    expect((retryRejected as { payload?: unknown }).payload).toBeDefined()
    // ...and the tag-writing matcher accepts `rejectedWithValue`, so the tags of a
    // *failed* query are recorded.
    expect(
      retryStore.store.getState().api.provided.keys[
        asCacheKey(retryPromise.queryCacheKey)
      ],
    ).toEqual([{ type: 'Thing' }])
  })
})
