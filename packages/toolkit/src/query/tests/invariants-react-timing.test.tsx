/**
 * Named assertions for the RTK Query React-binding invariants catalogued in
 * `dev-plans/redux/rtk/features/2026-07-rtk3-research/2026-07-26-invariants-react-timing.md`.
 *
 * Every test name starts with the `INV-R-NNN` id(s) it pins. These tests assert what the
 * code does *today*, including behavior that looks wrong — those spots are marked
 * `SUSPECTED BUG`. Nothing here asserts aspirational behavior.
 *
 * Measurement caveat: `useRenderCounter` counts *commits*, not render-function calls,
 * because it increments inside a dep-less `useEffect`. Renders that bail out before
 * commit are invisible to it. Tests that need true render granularity use
 * `@testing-library/react-render-stream` instead.
 */
import {
  setupApiStore,
  useRenderCounter,
  withProvider,
} from '@internal/tests/utils/helpers'
import type { Store } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import type { ReactNode } from 'react'
import { useRef } from 'react'

interface Post {
  id: number
  name: string
}

type FailingBaseQueryResult =
  | { data: unknown }
  | { error: { status: number; data: string } }

let queryCount = 0
let mutationCount = 0

const api = createApi({
  baseQuery: async (arg: any) => {
    if (arg.method === 'POST') {
      mutationCount++
      return { data: { id: arg.id, name: arg.name } satisfies Post }
    }
    queryCount++
    return { data: { id: arg.id, name: `post-${arg.id}-v${queryCount}` } }
  },
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      query: (id) => ({ id }),
      providesTags: ['Post'],
    }),
    updatePost: build.mutation<Post, Post>({
      query: (post) => ({ method: 'POST', ...post }),
      invalidatesTags: ['Post'],
    }),
  }),
})

const storeRef = setupApiStore(api, undefined, { withoutListeners: true })

beforeEach(() => {
  queryCount = 0
  mutationCount = 0
})

describe('D. Mutations', () => {
  // The missing analogue of PR #4651. That PR made the lazy *query* trigger promise agree with
  // what the hook renders, because the query family resolves from a store selector read taken
  // after the thunk settles. The mutation family never got that treatment: it resolves with
  // `{data}` wrapping the thunk payload via `asSafePromise(thunkResult.unwrap()...)`.
  it('INV-R-062: the mutation trigger promise resolves from the thunk payload, and settles before invalidation-driven refetches have delivered', async () => {
    const seen: Array<{
      fromPromise: Post | undefined
      mutationHookData: unknown
      invalidatedQueryData: unknown
      invalidatedQueryIsFetching: boolean | undefined
    }> = []

    function Component() {
      const [trigger, mutationState] = api.endpoints.updatePost.useMutation()
      const queryState = api.endpoints.getPost.useQuery(1)
      // Refs updated on every render, so reading them at promise-settle time reflects the
      // *latest committed* render rather than the render that created the click handler.
      const latest = useRef({ mutationState, queryState })
      latest.current = { mutationState, queryState }

      return (
        <button
          onClick={async () => {
            const result = await trigger({ id: 1, name: 'renamed' })
            seen.push({
              fromPromise: 'data' in result ? result.data : undefined,
              mutationHookData: latest.current.mutationState.data,
              invalidatedQueryData: latest.current.queryState.data,
              invalidatedQueryIsFetching:
                latest.current.queryState.isFetching,
            })
          }}
        >
          go
        </button>
      )
    }

    render(<Component />, { wrapper: storeRef.wrapper })
    await waitFor(() => expect(queryCount).toBe(1))

    await act(async () => {
      screen.getByRole('button').click()
    })

    expect(seen).toHaveLength(1)
    // The promise carries the thunk's own payload, produced by
    // `asSafePromise(thunkResult.unwrap().then(data => ({data})), ...)` — not a selector read.
    expect(seen[0].fromPromise).toEqual({ id: 1, name: 'renamed' })
    // For the mutation's *own* cache entry the two happen to agree, because the `fulfilled`
    // reducer has already run by the time the extra microtask resolves the wrapper.
    expect(seen[0].mutationHookData).toEqual({ id: 1, name: 'renamed' })
    // But the mutation invalidates the 'Post' tag, and the promise does not wait for that.
    // At settle time the invalidated query is mid-refetch and still shows its stale value.
    expect(seen[0].invalidatedQueryIsFetching).toBe(true)
    expect(seen[0].invalidatedQueryData).toEqual({
      id: 1,
      name: 'post-1-v1',
    })

    // The refetch does land, just later than the promise.
    await waitFor(() => expect(queryCount).toBe(2))
  })

  it('INV-R-062: the mutation promise never rejects — a failed mutation resolves with `{error}`', async () => {
    const failing = createApi({
      // The return type is annotated because a baseQuery that only ever returns `{error}`
      // infers a `data` type of `never`, which collapses the endpoint definition to the
      // `queryFn`-only branch and makes `query` invalid.
      baseQuery: async (_arg: string): Promise<FailingBaseQueryResult> => ({
        error: { status: 500, data: 'nope' },
      }),
      endpoints: (build) => ({
        boom: build.mutation<unknown, void>({ query: () => 'boom' }),
      }),
    })
    const failStore = setupApiStore(failing, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })

    const { result } = renderHook(() => failing.endpoints.boom.useMutation(), {
      wrapper: withProvider(failStore.store),
    })

    let settled: unknown
    await act(async () => {
      settled = await result.current[0]()
    })

    expect(settled).toEqual({ error: { status: 500, data: 'nope' } })
  })

  it('INV-R-063: mutation `.unwrap()` is the raw createAsyncThunk unwrap and DOES reject', async () => {
    const failing = createApi({
      baseQuery: async (_arg: string): Promise<FailingBaseQueryResult> => ({
        error: { status: 500, data: 'nope' },
      }),
      endpoints: (build) => ({
        boom: build.mutation<unknown, void>({ query: () => 'boom' }),
      }),
    })
    const failStore = setupApiStore(failing, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })

    const { result } = renderHook(() => failing.endpoints.boom.useMutation(), {
      wrapper: withProvider(failStore.store),
    })

    await act(async () => {
      // The wrapper promise resolves; only `.unwrap()` introduces rejection, and it is a
      // *different* promise chain (the thunk's own), not a re-read of the resolved wrapper.
      const promise = result.current[0]()
      await expect(promise.unwrap()).rejects.toEqual({
        status: 500,
        data: 'nope',
      })
      await expect(promise).resolves.toHaveProperty('error')
    })
  })

  it('INV-R-065: `selectDefaultResult` is memoized on the promise object, not on the requestId string', async () => {
    // The `useMemo` dep is `promise`, so a new trigger call rebuilds the selector even though
    // `requestId` is only read off it. Observable consequence: state resets to the new request.
    const { result } = renderHook(
      () => api.endpoints.updatePost.useMutation(),
      { wrapper: storeRef.wrapper },
    )

    await act(async () => {
      await result.current[0]({ id: 1, name: 'first' })
    })
    expect(result.current[1].data).toEqual({ id: 1, name: 'first' })
    const firstRequestId = result.current[1].requestId

    await act(async () => {
      await result.current[0]({ id: 2, name: 'second' })
    })
    expect(result.current[1].data).toEqual({ id: 2, name: 'second' })
    expect(result.current[1].requestId).not.toBe(firstRequestId)
  })

  it('INV-R-067: `triggerMutation` identity is stable while the state object identity changes per trigger', async () => {
    const { result } = renderHook(
      () => api.endpoints.updatePost.useMutation(),
      { wrapper: storeRef.wrapper },
    )

    const firstTrigger = result.current[0]
    const firstState = result.current[1]

    await act(async () => {
      await result.current[0]({ id: 1, name: 'x' })
    })

    // `triggerMutation` deps are `[dispatch, initiate, fixedCacheKey]` — none of which change.
    expect(result.current[0]).toBe(firstTrigger)
    // `finalState` deps include `reset`, whose deps include `promise`, so the state object is
    // a new identity after every trigger.
    expect(result.current[1]).not.toBe(firstState)
  })

  it('INV-R-070: the mutation hook does no arg stabilization and has no `skip`', async () => {
    // A query hook would serialize a fresh-but-equal object arg to the same cache key. The
    // mutation hook passes the arg straight to `initiate`, so each call is a distinct request.
    const { result } = renderHook(
      () => api.endpoints.updatePost.useMutation(),
      { wrapper: storeRef.wrapper },
    )

    await act(async () => {
      await result.current[0]({ id: 1, name: 'a' })
    })
    const firstRequestId = result.current[1].requestId

    await act(async () => {
      await result.current[0]({ id: 1, name: 'a' })
    })

    expect(result.current[1].requestId).not.toBe(firstRequestId)
    expect(mutationCount).toBe(2)
  })
})

describe('C. Lazy trigger', () => {
  it('INV-R-043: the lazy `trigger` identity never churns when subscription options change', async () => {
    // `trigger` deps are `[dispatch, initiate]`; options are read through
    // `subscriptionOptionsRef`, so changing them cannot produce a new trigger identity.
    const { result, rerender } = renderHook(
      ({ pollingInterval }: { pollingInterval: number }) =>
        api.endpoints.getPost.useLazyQuery({ pollingInterval }),
      {
        wrapper: storeRef.wrapper,
        initialProps: { pollingInterval: 0 },
      },
    )

    const firstTrigger = result.current[0]
    rerender({ pollingInterval: 10000 })
    expect(result.current[0]).toBe(firstTrigger)
  })

  it('INV-R-045: `trigger(arg, true)` is the only way to reuse a warm cache value', async () => {
    const { result } = renderHook(() => api.endpoints.getPost.useLazyQuery(), {
      wrapper: storeRef.wrapper,
    })

    await act(async () => {
      await result.current[0](1)
    })
    expect(queryCount).toBe(1)

    // Default `preferCacheValue = false` maps to `forceRefetch: true`.
    await act(async () => {
      await result.current[0](1)
    })
    expect(queryCount).toBe(2)

    // `preferCacheValue = true` maps to `forceRefetch: false`, so the warm entry is reused.
    await act(async () => {
      await result.current[0](1, true)
    })
    expect(queryCount).toBe(2)
  })

  it('INV-R-049: `useLazyQuery` and `useLazyQuerySubscription` expose the last arg through different shapes', async () => {
    const lazyQuery = renderHook(() => api.endpoints.getPost.useLazyQuery(), {
      wrapper: storeRef.wrapper,
    })
    const lazySubscription = renderHook(
      () => api.endpoints.getPost.useLazyQuerySubscription(),
      { wrapper: storeRef.wrapper },
    )

    await act(async () => {
      await lazyQuery.result.current[0](7)
      await lazySubscription.result.current[0](7)
    })

    // `useLazyQuery` -> [trigger, {...queryStateResults, reset}, {lastArg}]
    expect(lazyQuery.result.current[2]).toEqual({ lastArg: 7 })
    expect(typeof lazyQuery.result.current[1].reset).toBe('function')
    expect(lazyQuery.result.current[1]).toHaveProperty('data')

    // `useLazyQuerySubscription` -> [trigger, arg, {reset}]. The middle slot is the raw arg,
    // not an info object, and there is no query state at all.
    expect(lazySubscription.result.current[1]).toBe(7)
    expect(Object.keys(lazySubscription.result.current[2])).toEqual(['reset'])
  })

  it('INV-R-048 / INV-R-050: `reset()` removes the cache entry but never clears `lastArg`', async () => {
    const { result } = renderHook(() => api.endpoints.getPost.useLazyQuery(), {
      wrapper: storeRef.wrapper,
    })

    await act(async () => {
      await result.current[0](3)
    })
    expect(result.current[2].lastArg).toBe(3)
    expect(result.current[1].data).toBeDefined()

    await act(async () => {
      result.current[1].reset()
    })

    // `reset` dispatches only `removeQueryResult`, so the state goes back to uninitialized.
    expect(result.current[1].isUninitialized).toBe(true)
    expect(result.current[1].data).toBeUndefined()
    // But `arg` is `useState` in `useLazyQuerySubscription` and `reset` never touches it, so
    // `lastArg` survives a reset. There is no way to get back to `UNINITIALIZED_VALUE`.
    expect(result.current[2].lastArg).toBe(3)
  })

  it('INV-R-046 / INV-R-047: the unmount cleanup leaves `promiseRef` populated, so the fast-refresh reinstate effect cannot fire', async () => {
    // The reinstate effect is
    //   useEffect(() => {
    //     if (arg !== UNINITIALIZED_VALUE && !promiseRef.current) trigger(arg, true)
    //   }, [arg, trigger])
    // Its `trigger` dep changes when `dispatch` changes, which happens on a Provider store
    // swap. `arg` is preserved because the component instance is preserved. So the effect
    // re-runs with `arg` set — the exact shape the fast-refresh comment describes.
    const storeA = storeRef.store
    let currentStore: Store = storeA

    function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={currentStore}>{children}</Provider>
    }

    const { result, rerender, unmount } = renderHook(
      () => api.endpoints.getPost.useLazyQuery(),
      { wrapper: Wrapper },
    )

    await act(async () => {
      await result.current[0](9)
    })
    expect(queryCount).toBe(1)

    const storeB = setupApiStore(api, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    }).store
    currentStore = storeB

    await act(async () => {
      rerender()
    })

    // SUSPECTED BUG (INV-R-046 / INV-R-047): the lazy unmount cleanup calls only
    // `unsubscribePromiseRef(promiseRef)` and, unlike `usePromiseRefUnsubscribeOnUnmount`,
    // never sets `promiseRef.current = undefined`. So `!promiseRef.current` is false here and
    // the reinstate effect does nothing — the new store gets no request and no cache entry.
    // Asserting current behavior to lock the baseline.
    expect(queryCount).toBe(1)
    expect(
      api.endpoints.getPost.select(9)(storeB.getState() as never).status,
    ).toBe('uninitialized')

    unmount()
  })

  // Promise-table row 7 / cross-cutting fact 5. Not tied to a numbered invariant; the React-side
  // consequence of core `queryAction` branch 2 returning `Promise.resolve(stateAfter)`.
  it('promise-table row 7: a synchronously-skipped lazy trigger resolves with the PREVIOUS requestId', async () => {
    const { result } = renderHook(() => api.endpoints.getPost.useLazyQuery(), {
      wrapper: storeRef.wrapper,
    })

    let first: Awaited<ReturnType<typeof result.current[0]>> | undefined
    await act(async () => {
      first = await result.current[0](11)
    })
    const firstRequestId = first!.requestId

    // `preferCacheValue: true` with a warm entry means `queryAction` takes branch 2 and
    // returns `Promise.resolve(stateAfter)` — the thunk is skipped synchronously.
    let second: typeof first
    await act(async () => {
      second = await result.current[0](11, true)
    })

    expect(queryCount).toBe(1)
    // SUSPECTED BUG (promise-table row 7): the resolved value carries the *previous*
    // `requestId`, so anyone keying off `requestId` to detect "did my call actually run" gets
    // a wrong answer. Asserting current behavior to lock the baseline.
    expect(second!.requestId).toBe(firstRequestId)
  })
})

describe('A. Subscription lifecycle', () => {
  test('INV-R-005: `subscriptionRemoved` forces the subscribe effect to re-run and re-subscribe, and its dead `console.log` never fires', async () => {
    // buildHooks.ts:1771-1777 contains a `console.log(subscriptionRemoved)` guarded by
    // `process.env.NODE_ENV === 'removeMeOnCompilation'`, with an in-code comment saying it
    // "is only present to enforce the rule of hooks to keep `isSubscribed` in the dependency
    // array". The log itself has no live code path under any real NODE_ENV. What IS observable
    // is the reason the flag exists: when the subscription disappears from under a still-mounted
    // hook, `subscriptionRemoved` flips, the effect re-runs, and the hook re-subscribes with a
    // fresh request rather than sitting there permanently unsubscribed.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { result } = renderHook(() => api.endpoints.getPost.useQuery(1), {
      wrapper: storeRef.wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryCount).toBe(1)

    // Remove the cache entry (and with it the subscription) from under the mounted hook.
    act(() => {
      storeRef.store.dispatch(api.util.resetApiState())
    })

    // The effect re-ran and re-subscribed, producing a second request.
    await waitFor(() => expect(queryCount).toBe(2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The dead guarded log never executed.
    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })

  test('INV-R-021: `subscriptionSelectorsRef` is captured once per hook instance and is never refreshed after a store swap', async () => {
    // buildHooks.ts:1706-1727 captures the middleware's subscription selectors under
    // `if (!subscriptionSelectorsRef.current)`. After a store swap, `useSelector`/`useDispatch`
    // follow the new store while this ref still points at the OLD store's middleware.
    const storeA = setupApiStore(api, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    }).store
    const storeB = setupApiStore(api, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    }).store

    let currentStore: Store = storeA

    function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={currentStore}>{children}</Provider>
    }

    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useQuery(21),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryCount).toBe(1)

    currentStore = storeB
    await act(async () => {
      rerender()
      await Promise.resolve()
    })
    await new Promise((r) => setTimeout(r, 50))

    // SUSPECTED BUG (INV-R-021): the hook is now permanently stuck.
    //
    // The causal chain, all of it verified against buildHooks.ts:
    //   1. `subscriptionSelectorsRef` was captured from storeA's middleware and is guarded by
    //      `if (!subscriptionSelectorsRef.current)`, so it is never refreshed. The render-phase
    //      `isRequestSubscribed` probe therefore asks storeA whether the request is subscribed.
    //   2. storeA says yes, so `currentRenderHasSubscription` is true and `subscriptionRemoved`
    //      is false. The effect that would clear `promiseRef.current` never fires.
    //   3. `dispatch` did change, so the subscribe effect does re-run — but its guard is
    //      `if (!lastPromise || lastPromise.arg !== stableArg)`. `promiseRef.current` still holds
    //      storeA's promise and its `.arg` is still 21, so the guard is false and the effect
    //      falls into the `else if` options-only branch, which does nothing.
    //
    // Net result: no request is ever issued against storeB, storeB's cache entry stays
    // uninitialized, and the hook reports the fabricated `pending` state forever.
    //
    // Note the coupling: if the ref *were* refreshed to storeB's middleware, step 2 would report
    // "not subscribed", `promiseRef.current` would be cleared, and step 3's guard would pass on
    // the next run — the hook would recover on its own. The stale ref is precisely what blocks
    // recovery. Asserting current behavior to lock the baseline.
    expect(queryCount).toBe(1)
    expect(
      api.endpoints.getPost.select(21)(storeA.getState() as never).status,
    ).toBe('fulfilled')
    expect(
      api.endpoints.getPost.select(21)(storeB.getState() as never).status,
    ).toBe('uninitialized')
    expect(result.current.status).toBe('pending')
    expect(result.current.isFetching).toBe(true)
  })

  test('INV-R-022: `useQuery` runs the subscription hook before the state hook, so the first committed render already reflects the dispatch', async () => {
    // buildHooks.ts:2061-2078. `useQuerySubscription` dispatches `initiate` from the render
    // phase; `useQueryState` then selects. Because the dispatch happens first, the very first
    // committed render of a cold query already shows the fabricated pending state rather than
    // `uninitialized`.
    const seen: Array<{ status: string; isLoading: boolean }> = []

    function Component() {
      const res = api.endpoints.getPost.useQuery(22)
      seen.push({ status: res.status, isLoading: res.isLoading })
      return <div data-testid="status">{res.status}</div>
    }

    render(<Component />, { wrapper: storeRef.wrapper })

    expect(seen[0]).toEqual({ status: 'pending', isLoading: true })
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('fulfilled'),
    )
  })
})

describe('B. Standard useQuery', () => {
  test('INV-R-030: `selectDefaultResult` is rebuilt only when `select` or the stable arg changes, so an equal object arg does not churn it', async () => {
    // `useMemo(..., [select, stableArg])`. `useStableQueryArgs` serializes the arg, so a new
    // object that serializes identically yields the same `stableArg` and the same selector.
    const objApi = createApi({
      baseQuery: async (arg: { id: number }) => {
        queryCount++
        return { data: { id: arg.id, name: `n${queryCount}` } }
      },
      endpoints: (build) => ({
        getObj: build.query<Post, { id: number }>({ query: (a) => a }),
      }),
    })
    const objStore = setupApiStore(objApi, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })

    const { result, rerender } = renderHook(
      ({ arg }: { arg: { id: number } }) => objApi.endpoints.getObj.useQuery(arg),
      {
        wrapper: withProvider(objStore.store),
        initialProps: { arg: { id: 1 } },
      },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstResult = result.current

    // Fresh object, same serialization.
    rerender({ arg: { id: 1 } })

    expect(queryCount).toBe(1)
    // The selector was not rebuilt, so the memoized result object is referentially identical.
    expect(result.current.data).toBe(firstResult.data)
  })

  test('INV-R-031: the out-of-band `store.getState()` during render bypasses the `useSelector` snapshot to compute `lastValue`', async () => {
    // buildHooks.ts:1885-1889 calls `selectDefaultResult(store.getState(), lastValue.current)`
    // outside the `useSelector` subscription, and commits the result to `lastValue.current` in
    // a layout effect. `lastValue` is what feeds the `isLoading`/`currentData` smoothing, so it
    // reflects the live store rather than the snapshot React rendered with.
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => api.endpoints.getPost.useQuery(id),
      { wrapper: storeRef.wrapper, initialProps: { id: 1 } },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.currentData).toEqual({ id: 1, name: 'post-1-v1' })

    // Switch to a cold arg. `currentData` is dropped immediately (it is scoped to the current
    // arg) while `data` is retained from `lastValue` — the smoothing that `lastValue` powers.
    rerender({ id: 2 })
    expect(result.current.currentData).toBeUndefined()
    expect(result.current.data).toEqual({ id: 1, name: 'post-1-v1' })
    expect(result.current.isFetching).toBe(true)
    // `isLoading` stays false because this hook instance already delivered data once.
    expect(result.current.isLoading).toBe(false)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 2, name: 'post-2-v2' })
    expect(result.current.currentData).toEqual({ id: 2, name: 'post-2-v2' })
  })

  test('INV-R-040: `refetch` identity is stable for the whole component lifetime, and subscription fields win the result spread', async () => {
    // `querySubscriptionResults` is `useMemo(() => ({refetch}), [promiseRef])` and `promiseRef`
    // is a ref, so it never changes. `useQuery` returns
    // `{...queryStateResults, ...querySubscriptionResults}` — subscription keys are spread last.
    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useQuery(1),
      { wrapper: storeRef.wrapper },
    )

    const firstRefetch = result.current.refetch
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.refetch).toBe(firstRefetch)

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.refetch).toBe(firstRefetch)

    rerender()
    expect(result.current.refetch).toBe(firstRefetch)

    // `refetch` comes from the subscription half of the spread, and the state half never
    // supplies a key of that name, so there is nothing for it to shadow in practice.
    expect(typeof result.current.refetch).toBe('function')
  })

  test('INV-R-022: a bare `useQueryState` neither subscribes nor fetches, unlike `useQuery`', async () => {
    // `useQuery` = `useQuerySubscription` + `useQueryState`. Using the state half alone proves
    // the fetch comes entirely from the subscription half.
    const { result } = renderHook(
      () => api.endpoints.getPost.useQueryState(40),
      { wrapper: storeRef.wrapper },
    )

    expect(queryCount).toBe(0)
    expect(result.current.isUninitialized).toBe(true)
  })
})

describe('E. selectFromResult & render suppression', () => {
  test('INV-R-076: the query `selectFromResult` wrapper disables the identity-function dev check, the mutation one does not', async () => {
    // `buildUseQueryState` builds its wrapper with
    // `createSelector([selectDefaultResult], selectFromResult, {devModeChecks: {identityFunctionCheck: 'never'}})`
    // (buildHooks.ts:1869-1877). `buildMutationHook` builds its wrapper without that option
    // (buildHooks.ts:2240-2246). So an identity `selectFromResult` warns for a mutation but not
    // for a query. Asserting the asymmetry as it exists today.
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      renderHook(
        () =>
          api.endpoints.getPost.useQuery(50, { selectFromResult: (r) => r }),
        { wrapper: storeRef.wrapper },
      )
      await waitFor(() => expect(queryCount).toBe(1))

      const identityWarning = (call: unknown[]) =>
        String(call[0]).includes('returned its own inputs without modification')

      expect(spy.mock.calls.filter(identityWarning)).toHaveLength(0)

      spy.mockClear()

      const { result } = renderHook(
        () =>
          api.endpoints.updatePost.useMutation({
            selectFromResult: (r) => r,
          }),
        { wrapper: storeRef.wrapper },
      )
      await act(async () => {
        await result.current[0]({ id: 50, name: 'x' })
      })

      expect(spy.mock.calls.filter(identityWarning).length).toBeGreaterThan(0)
    } finally {
      spy.mockRestore()
    }
  })

  test('INV-R-082: `selectFromResult` is called with exactly one argument and never sees `lastValue`', async () => {
    // `querySelector` is `createSelector([selectDefaultResult], selectFromResult, ...)`, so the
    // user function is the *result* function of a one-input selector. `lastValue.current` is
    // threaded in as the second argument to `selectDefaultResult`, never forwarded onward.
    const argCounts: number[] = []
    const secondArgs: unknown[] = []

    renderHook(
      () =>
        api.endpoints.getPost.useQuery(60, {
          selectFromResult: (...args) => {
            // The parameter list is typed as a 1-tuple, which is itself part of the
            // invariant. Widen to read past it and prove nothing is there at runtime.
            const actualArgs = args as unknown[]
            argCounts.push(actualArgs.length)
            secondArgs.push(actualArgs[1])
            return { name: args[0].data?.name }
          },
        }),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(queryCount).toBe(1))

    expect(argCounts.length).toBeGreaterThan(0)
    expect(new Set(argCounts)).toEqual(new Set([1]))
    expect(secondArgs.every((a) => a === undefined)).toBe(true)
  })

  test('INV-R-079: an inline `selectFromResult` runs on every render, yet still suppresses re-renders', async () => {
    // An inline arrow is a new identity each render, so the `querySelector` `useMemo`
    // (deps `[selectDefaultResult, selectFromResult]`) is invalidated every render and the user
    // function re-runs. Suppression survives anyway because `selectDefaultResult` is stable and
    // `useSelector` compares the user function's *output* with `shallowEqual`.
    //
    // Render counts here come from `useRenderCounter`, which increments in a dep-less
    // `useEffect` — it counts COMMITS, not render-function invocations.
    let selectCalls = 0
    let getRenderCount: () => number = () => 0

    function Component({ unrelated }: { unrelated: number }) {
      getRenderCount = useRenderCounter()
      const { name } = api.endpoints.getPost.useQuery(61, {
        selectFromResult: (res) => {
          selectCalls++
          return { name: res.data?.name }
        },
      })
      return (
        <div>
          <div data-testid="name">{String(name)}</div>
          <div data-testid="unrelated">{unrelated}</div>
        </div>
      )
    }

    const { rerender } = render(<Component unrelated={0} />, {
      wrapper: storeRef.wrapper,
    })
    await waitFor(() =>
      expect(screen.getByTestId('name').textContent).toBe('post-61-v1'),
    )

    const callsAfterLoad = selectCalls
    const commitsAfterLoad = getRenderCount()

    // Re-render for a reason unrelated to the cache entry. The user function runs again
    // because the wrapper selector was rebuilt...
    rerender(<Component unrelated={1} />)
    expect(selectCalls).toBeGreaterThan(callsAfterLoad)

    // ...but its output is shallow-equal, so refetching the same data adds no extra commit
    // beyond the one this parent-driven re-render itself caused.
    const commitsAfterRerender = getRenderCount()
    expect(commitsAfterRerender).toBe(commitsAfterLoad + 1)

    // A store update that does not change the selected slice is fully suppressed.
    await act(async () => {
      storeRef.store.dispatch(
        api.endpoints.getPost.initiate(999) as never,
      ) as never
      await waitFor(() => expect(queryCount).toBe(2))
    })
    expect(getRenderCount()).toBe(commitsAfterRerender)
  })
})

describe('G. Infinite queries', () => {
  let serializeCalls = 0
  let pageFetches = 0

  // NOTE: no custom `reducerPath` — `setupApiStore` hardcodes the reducer at the `api` key.
  const infApi = createApi({
    baseQuery: () => ({ data: null }),
    serializeQueryArgs: ({ endpointName, queryArgs }) => {
      serializeCalls++
      return `${endpointName}(${JSON.stringify(queryArgs)})`
    },
    endpoints: (build) => ({
      getPage: build.infiniteQuery<string[], string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_last, _all, lastPageParam) => lastPageParam + 1,
          getPreviousPageParam: (_first, _all, firstPageParam) =>
            firstPageParam > 0 ? firstPageParam - 1 : undefined,
        },
        async queryFn({ queryArg, pageParam }) {
          pageFetches++
          return { data: [`${queryArg}-page-${pageParam}`] }
        },
      }),
      getOne: build.query<string, string>({
        queryFn: async (arg) => ({ data: arg }),
      }),
    }),
  })

  const infStoreRef = setupApiStore(infApi, undefined, {
    withoutListeners: true,
  })

  beforeEach(() => {
    serializeCalls = 0
    pageFetches = 0
  })

  test('INV-R-103: the double arg stabilization in the infinite hook is idempotent and is not observable through `serializeQueryArgs`', async () => {
    // CATALOG CORRECTION (INV-R-103). The catalog says `useStableQueryArgs` "runs twice" for an
    // infinite query and implies the user's `serializeQueryArgs` is therefore invoked twice as
    // often. The double call is real — `useQuerySubscriptionCommonImpl` stabilizes the arg
    // (buildHooks.ts:1728) and `useInfiniteQuerySubscription` stabilizes it again
    // (buildHooks.ts:2127) — but the mechanism described is out of date. The current
    // implementation is:
    //
    //   export function useStableQueryArgs<T>(queryArgs: T) {
    //     const cache = useRef(queryArgs)
    //     const copy = useMemo(() => copyWithStructuralSharing(cache.current, queryArgs), [queryArgs])
    //     ...
    //   }
    //
    // (useSerializedStableValue.ts:4-17). It takes no serializer and no endpoint name, so it never
    // calls `serializeQueryArgs`. Asserting the two things that ARE observable: the serializer call
    // count does NOT differ between a standard and an infinite hook, and structural sharing still
    // produces a referentially stable arg after being applied twice.
    const standard = renderHook(() => infApi.endpoints.getOne.useQuery('a'), {
      wrapper: infStoreRef.wrapper,
    })
    await waitFor(() => expect(standard.result.current.isSuccess).toBe(true))
    const standardCalls = serializeCalls

    serializeCalls = 0

    const infinite = renderHook(
      () => infApi.endpoints.getPage.useInfiniteQuery('b'),
      { wrapper: infStoreRef.wrapper },
    )
    await waitFor(() => expect(infinite.result.current.isSuccess).toBe(true))

    expect(serializeCalls).toBe(standardCalls)
  })

  test('INV-R-103: applying `copyWithStructuralSharing` twice still yields a referentially stable arg', async () => {
    // The practical guarantee the double stabilization must not break: a new-but-deep-equal object
    // arg must not be treated as a new cache key, and must not produce a new `data` identity.
    const objInfApi = createApi({
      baseQuery: () => ({ data: null }),
      endpoints: (build) => ({
        pages: build.infiniteQuery<string[], { kind: string }, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (_l, _a, lastPageParam) => lastPageParam + 1,
          },
          queryFn: async ({ queryArg, pageParam }) => ({
            data: [`${queryArg.kind}-${pageParam}`],
          }),
        }),
      }),
    })
    const objStoreRef = setupApiStore(objInfApi, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })

    const { result, rerender } = renderHook(
      ({ kind }: { kind: string }) =>
        objInfApi.endpoints.pages.useInfiniteQuery({ kind }),
      {
        wrapper: objStoreRef.wrapper,
        initialProps: { kind: 'x' },
      },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstData = result.current.data

    // New object literal, same contents.
    rerender({ kind: 'x' })

    expect(result.current.data).toBe(firstData)
    expect(result.current.isFetching).toBe(false)
  })

  test('INV-R-097 / INV-R-100: the infinite trigger drives re-renders purely from the store, and `useInfiniteQuery` does not expose it', async () => {
    // `useLazyQuerySubscription`'s trigger calls `setArg(arg)` inside its `batch()`, so it forces a
    // React state update. The infinite trigger (buildHooks.ts:2104-2122) has no `setArg` at all —
    // the only thing that can re-render the component is the store notification.
    const subscription = renderHook(
      () => infApi.endpoints.getPage.useInfiniteQuerySubscription('c'),
      { wrapper: infStoreRef.wrapper },
    )

    // INV-R-100: the subscription hook returns `trigger`...
    expect(typeof subscription.result.current.trigger).toBe('function')
    expect(typeof subscription.result.current.refetch).toBe('function')
    expect(typeof subscription.result.current.fetchNextPage).toBe('function')
    expect(typeof subscription.result.current.fetchPreviousPage).toBe(
      'function',
    )

    // ...and, unlike `useLazyQuerySubscription` which returns `[trigger, arg, {reset}]`, it exposes
    // no `arg`, because there is no `arg` state to expose.
    expect('arg' in subscription.result.current).toBe(false)

    await waitFor(() => expect(pageFetches).toBe(1))

    // INV-R-100: `useInfiniteQuery` spreads only `{...queryStateResults, fetchNextPage,
    // fetchPreviousPage, refetch}` (buildHooks.ts:2179-2207), so `trigger` is dropped on the floor.
    const full = renderHook(
      () => infApi.endpoints.getPage.useInfiniteQuery('d'),
      { wrapper: infStoreRef.wrapper },
    )
    await waitFor(() => expect(full.result.current.isSuccess).toBe(true))

    expect('trigger' in full.result.current).toBe(false)
    expect(typeof full.result.current.fetchNextPage).toBe('function')
    expect(typeof full.result.current.fetchPreviousPage).toBe('function')
    expect(typeof full.result.current.refetch).toBe('function')
  })

  test('INV-R-104: `fetchNextPage`, `fetchPreviousPage` and `refetch` identities survive a re-render with an unchanged arg', async () => {
    // Deps: `fetchNextPage`/`fetchPreviousPage` are `useMemo(..., [refetch, trigger, stableArg])`;
    // `refetch` is `[promiseRef, stableHookRefetchCachedPages]`; `trigger` is
    // `[promiseRef, dispatch, initiate]`. With a stable arg and store, none of those change.
    const { result, rerender } = renderHook(
      () => infApi.endpoints.getPage.useInfiniteQuery('e'),
      { wrapper: infStoreRef.wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { fetchNextPage, fetchPreviousPage, refetch } = result.current

    rerender()

    expect(result.current.fetchNextPage).toBe(fetchNextPage)
    expect(result.current.fetchPreviousPage).toBe(fetchPreviousPage)
    expect(result.current.refetch).toBe(refetch)

    // Fetching another page does not churn them either — `stableArg` is unchanged and the
    // `promiseRef` object identity is stable for the hook's lifetime.
    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(pageFetches).toBe(2))

    expect(result.current.fetchNextPage).toBe(fetchNextPage)
    expect(result.current.fetchPreviousPage).toBe(fetchPreviousPage)
    expect(result.current.refetch).toBe(refetch)
  })
})

describe('H. usePrefetch', () => {
  test('INV-R-107: the prefetch callback identity survives a new-but-shallow-equal `defaultOptions` object', async () => {
    // `usePrefetch` is `useCallback(..., [endpointName, dispatch, stableDefaultOptions])` where
    // `stableDefaultOptions = useShallowStableValue(defaultOptions)`. Passing a fresh object literal
    // with the same contents must not churn the callback identity.
    const { result, rerender } = renderHook(
      ({ force }: { force: boolean }) => api.usePrefetch('getPost', { force }),
      {
        wrapper: storeRef.wrapper,
        initialProps: { force: true },
      },
    )

    const firstPrefetch = result.current

    // New object literal, shallow-equal contents.
    rerender({ force: true })
    expect(result.current).toBe(firstPrefetch)

    // A genuinely different value does produce a new callback.
    rerender({ force: false })
    expect(result.current).not.toBe(firstPrefetch)
  })
})

describe('K. React module attachment', () => {
  test('INV-R-122 / INV-R-124: hooks are attached per endpoint at injection time, and the infinite branch is chained off the mutation branch', async () => {
    // `injectEndpoint` (react/module.ts:230-271) is structured as
    //   if (isQueryDefinition(definition)) { ...5 query hooks... }
    //   if (isMutationDefinition(definition)) { ...useMutation... }
    //   else if (isInfiniteQueryDefinition(definition)) { ...3 infinite hooks... }
    // so the infinite branch can only be reached when the mutation branch is not taken. Each hook is
    // written onto the endpoint object itself, which is why they exist only after injection.
    const attachApi = createApi({
      baseQuery: () => ({ data: null }),
      endpoints: (build) => ({
        aQuery: build.query<string, void>({ queryFn: async () => ({ data: 'q' }) }),
        aMutation: build.mutation<string, void>({
          queryFn: async () => ({ data: 'm' }),
        }),
        anInfinite: build.infiniteQuery<string[], void, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (_l, _a, p) => p + 1,
          },
          queryFn: async () => ({ data: ['i'] }),
        }),
      }),
    })

    const queryHooks = [
      'useQuery',
      'useLazyQuery',
      'useLazyQuerySubscription',
      'useQueryState',
      'useQuerySubscription',
    ] as const
    for (const name of queryHooks) {
      expect(typeof attachApi.endpoints.aQuery[name]).toBe('function')
    }
    expect('useMutation' in attachApi.endpoints.aQuery).toBe(false)
    expect('useInfiniteQuery' in attachApi.endpoints.aQuery).toBe(false)

    expect(typeof attachApi.endpoints.aMutation.useMutation).toBe('function')
    for (const name of queryHooks) {
      expect(name in attachApi.endpoints.aMutation).toBe(false)
    }

    const infiniteHooks = [
      'useInfiniteQuery',
      'useInfiniteQuerySubscription',
      'useInfiniteQueryState',
    ] as const
    for (const name of infiniteHooks) {
      expect(typeof attachApi.endpoints.anInfinite[name]).toBe('function')
    }
    // The `else if` chaining means an infinite endpoint never picks up `useMutation`.
    expect('useMutation' in attachApi.endpoints.anInfinite).toBe(false)
  })

  test('INV-R-123: root-level hook aliases are plain assignments with no collision check, so the last injection wins', async () => {
    // KNOWN ACCEPTED LIMITATION (answered by Mark, 2026-07-28). There are open GitHub issues asking
    // for a hook-name-prefixing option; nothing has been implemented. There is no prefix option, no
    // collision check, and no dev warning. Asserting the current last-injection-wins behavior so the
    // baseline is pinned before any prefixing work happens.
    const collideApi = createApi({
      baseQuery: () => ({ data: null }),
      endpoints: (build) => ({
        thing: build.query<string, void>({
          queryFn: async () => ({ data: 'original' }),
        }),
      }),
    })

    const original = collideApi.useThingQuery
    expect(typeof original).toBe('function')

    const injected = collideApi.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        thing: build.query<string, void>({
          queryFn: async () => ({ data: 'replacement' }),
        }),
      }),
    })

    // The alias was silently overwritten — no throw, no warning, and the root alias now points at
    // the hook built for the replacement definition.
    expect(typeof injected.useThingQuery).toBe('function')
    expect(injected.useThingQuery).not.toBe(original)

    const store = setupApiStore(collideApi, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })
    const { result } = renderHook(() => injected.useThingQuery(), {
      wrapper: store.wrapper,
    })
    await waitFor(() => expect(result.current.data).toBe('replacement'))
  })

  test('INV-R-127: `usePrefetch` lives on the API root and is callable for an endpoint that has not been injected yet', async () => {
    // `safeAssign(anyApi, {usePrefetch})` happens once in the module's `init`, before any endpoint
    // exists, so unlike every other hook it is not per-endpoint. Nothing validates the endpoint name.
    const lateApi = createApi({
      baseQuery: () => ({ data: null }),
      endpoints: () => ({}),
    })

    expect(typeof lateApi.usePrefetch).toBe('function')

    const store = setupApiStore(lateApi, undefined, {
      withoutListeners: true,
      withoutTestLifecycles: true,
    })

    // Calling the hook for a name that does not exist yet is fine — building the callback does not
    // touch the endpoint registry.
    const { result } = renderHook(
      // @ts-expect-error `notYet` is deliberately not a known endpoint name
      () => lateApi.usePrefetch('notYet'),
      { wrapper: store.wrapper },
    )
    expect(typeof result.current).toBe('function')

    const injected = lateApi.injectEndpoints({
      endpoints: (build) => ({
        notYet: build.query<string, void>({
          queryFn: async () => ({ data: 'late' }),
        }),
      }),
    })

    // The same root-level `usePrefetch` now resolves the freshly injected endpoint.
    expect(injected.usePrefetch).toBe(lateApi.usePrefetch)

    // The callback was built for an endpoint name the types did not know about, so its
    // parameter is `never`. Widening it is what lets us actually invoke it.
    const prefetchNotYet = result.current as (arg: void) => void
    await act(async () => {
      prefetchNotYet()
    })
    await waitFor(() =>
      expect(
        injected.endpoints.notYet.select()(store.store.getState() as never).data,
      ).toBe('late'),
    )
  })
})

