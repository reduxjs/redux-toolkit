import type { Middleware, Reducer, UnknownAction } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery, QueryStatus } from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'

/**
 * Named assertions for the invariants catalogued in
 * `2026-07-26-invariants-mutations-invalidation.md` (INV-M-001 … INV-M-068).
 *
 * Every test name starts with the invariant ID(s) it covers so it greps back to
 * the catalog. Tests marked `SUSPECTED BUG` lock in today's behavior on purpose;
 * they are not statements about what the behavior should be.
 *
 * Some invariants here would naturally live in `buildSlice.test.ts`,
 * `buildThunks.test.tsx` or `cacheLifecycle.test.ts`. Those files are owned by
 * other work in flight, so the tests live here instead.
 */

/**
 * Lets a test decide exactly when each in-flight request settles. Same shape as
 * the factory in `raceConditions.test.ts`, which is the reference pattern for
 * asserting deferral timing.
 */
function createPromiseFactory() {
  const resolveQueue: (() => void)[] = []
  const createPromise = () =>
    new Promise<void>((resolve) => {
      resolveQueue.push(resolve)
    })
  const resolveOldest = () => {
    resolveQueue.shift()?.()
  }
  const pendingCount = () => resolveQueue.length
  return { createPromise, resolveOldest, pendingCount }
}

// `any` here is unavoidable: this constraint has to accept every one of the ~20
// differently-shaped `createApi` results in this file, and both `Reducer` and the
// `resetApiState` action creator are invariant in their state/action parameters.
function makeStore<
  A extends {
    reducerPath: 'api'
    reducer: Reducer<any, any>
    middleware: Middleware
    util: { resetApiState(): any }
  },
>(api: A) {
  return setupApiStore(
    api,
    { ...actionsReducer },
    { withoutTestLifecycles: true },
  )
}

describe('mutation initiation & fixedCacheKey', () => {
  it('INV-M-002: mutationThunk has no `condition`, so identical concurrent dispatches each run the base query', async () => {
    let baseQueryCallCount = 0
    const api = createApi({
      baseQuery: async () => {
        baseQueryCallCount++
        await delay(1)
        return { data: null }
      },
      endpoints: (build) => ({
        update: build.mutation<null, number>({ query: (id) => `${id}` }),
      }),
    })
    const { store } = makeStore(api)

    const first = store.dispatch(api.endpoints.update.initiate(1))
    const second = store.dispatch(api.endpoints.update.initiate(1))

    expect(first.requestId).not.toBe(second.requestId)
    await Promise.all([first, second])

    expect(baseQueryCallCount).toBe(2)
  })

  it('INV-M-006: a mutation displaced from state by a shared `fixedCacheKey` still invalidates its own tags', async () => {
    const mutationGate = createPromiseFactory()
    let aCount = 0
    let bCount = 0

    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['A', 'B'],
      endpoints: (build) => ({
        providesA: build.query<number, void>({
          queryFn: () => ({ data: ++aCount }),
          providesTags: ['A'],
        }),
        providesB: build.query<number, void>({
          queryFn: () => ({ data: ++bCount }),
          providesTags: ['B'],
        }),
        update: build.mutation<string, 'A' | 'B'>({
          queryFn: async (which) => {
            await mutationGate.createPromise()
            return { data: which }
          },
          invalidatesTags: (result, error, which) => [which],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.providesA.initiate())
    store.dispatch(api.endpoints.providesB.initiate())
    await delay(2)
    expect(aCount).toBe(1)
    expect(bCount).toBe(1)

    // Both mutations share one `fixedCacheKey`, so the second `pending` writes the
    // entry wholesale (buildSlice.ts:436-448) and displaces the first.
    const first = store.dispatch(
      api.endpoints.update.initiate('A', { fixedCacheKey: 'shared' }),
    )
    const second = store.dispatch(
      api.endpoints.update.initiate('B', { fixedCacheKey: 'shared' }),
    )

    expect(Object.keys(store.getState().api.mutations)).toEqual(['shared'])
    expect(store.getState().api.mutations['shared']?.requestId).toBe(
      second.requestId,
    )

    mutationGate.resolveOldest()
    mutationGate.resolveOldest()
    await Promise.all([first, second])
    await delay(5)

    // The first mutation's result is silently dropped: `fulfilled` still guards on
    // `requestId` (buildSlice.ts:449-468), so only the second one writes `data`.
    expect(store.getState().api.mutations['shared']?.data).toBe('B')

    // …yet both invalidations happened, because invalidation keys off the action
    // alone and never asks who won the entry.
    expect(aCount).toBe(2)
    expect(bCount).toBe(2)
  })

  it('INV-M-008, INV-M-009: every `fixedCacheKey` trigger runs `onQueryStarted` and `onCacheEntryAdded`, but only the newest cache lifecycle can ever be removed', async () => {
    // SUSPECTED BUG (INV-M-009): `cacheLifecycle.ts:282-288` calls `handleNewKey`
    // on every `mutationThunk.pending` with no guard for an existing lifecycle
    // (the query path guards at :266-269). Re-triggering a `fixedCacheKey`
    // mutation overwrites `lifecycleMap[cacheKey]`, so the displaced entry's
    // `cacheEntryRemoved` promise never settles. Asserting current behavior to
    // lock the baseline; this is expected to be fixed separately.
    let onQueryStartedCount = 0
    let onCacheEntryAddedCount = 0
    const removedOrder: number[] = []

    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          onQueryStarted() {
            onQueryStartedCount++
          },
          async onCacheEntryAdded(arg, { cacheEntryRemoved }) {
            const index = ++onCacheEntryAddedCount
            await cacheEntryRemoved
            removedOrder.push(index)
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    await store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    await store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    await delay(2)

    // INV-M-008: `queryLifecycle` keys by `requestId`, so it fires once per trigger.
    expect(onQueryStartedCount).toBe(2)
    // `cacheLifecycle` keys by `fixedCacheKey ?? requestId` but still calls
    // `handleNewKey` unconditionally, so it also fires once per trigger.
    expect(onCacheEntryAddedCount).toBe(2)
    expect(removedOrder).toEqual([])

    store.dispatch(api.util.resetApiState())
    await delay(2)

    // Only the second lifecycle is still in `lifecycleMap`. The first one's
    // `cacheEntryRemoved` never resolves — that is the leak.
    expect(removedOrder).toEqual([2])
  })

  it('INV-M-012: `reset()` removes the entry immediately without aborting; tags still invalidate and `queryFulfilled` still resolves', async () => {
    const mutationGate = createPromiseFactory()
    let queryCount = 0
    let queryFulfilledResolved = false
    let baseQueryFinished = false

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
            await mutationGate.createPromise()
            baseQueryFinished = true
            return { data: 'done' }
          },
          invalidatesTags: ['Post'],
          async onQueryStarted(arg, { queryFulfilled }) {
            await queryFulfilled
            queryFulfilledResolved = true
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(2)
    expect(queryCount).toBe(1)

    const mutation = store.dispatch(api.endpoints.update.initiate())
    expect(store.getState().api.mutations[mutation.requestId]?.status).toBe(
      QueryStatus.pending,
    )

    mutation.reset()
    // Synchronous removal — the JSDoc's "usual caching grace period" does not apply.
    expect(store.getState().api.mutations[mutation.requestId]).toBeUndefined()

    mutationGate.resolveOldest()
    await mutation
    await delay(5)

    expect(baseQueryFinished).toBe(true)
    expect(queryFulfilledResolved).toBe(true)
    // The settle reducers no-op via `updateMutationSubstateIfExists`, so the entry
    // stays gone rather than reappearing as `fulfilled`.
    expect(store.getState().api.mutations[mutation.requestId]).toBeUndefined()
    // …but the invalidation still fired.
    expect(queryCount).toBe(2)
  })

  it('INV-M-013: mutation entries are never garbage collected, regardless of `keepUnusedDataFor`', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      keepUnusedDataFor: 0.001,
      endpoints: (build) => ({
        getPosts: build.query<null, void>({ queryFn: () => ({ data: null }) }),
        update: build.mutation<null, number>({
          queryFn: () => ({ data: null }),
        }),
      }),
    })
    const { store } = makeStore(api)

    const query = store.dispatch(
      api.endpoints.getPosts.initiate(undefined, { subscribe: false }),
    )
    const mutations = await Promise.all([
      store.dispatch(api.endpoints.update.initiate(1)),
      store.dispatch(api.endpoints.update.initiate(2)),
      store.dispatch(api.endpoints.update.initiate(3)),
    ])
    await query
    await delay(20)

    // `canTriggerUnsubscribe` (cacheCollection.ts:68-73) lists no mutation action,
    // so nothing ever schedules a mutation entry for removal.
    expect(Object.keys(store.getState().api.queries)).toEqual([])
    expect(Object.keys(store.getState().api.mutations).sort()).toEqual(
      mutations.map(() => expect.any(String)),
    )
    expect(Object.keys(store.getState().api.mutations)).toHaveLength(3)
  })

  it('INV-M-017: `runningMutations` is keyed by both requestId and fixedCacheKey, is registered synchronously, and is drained before the caller`s own await resumes', async () => {
    // CATALOG CORRECTION (INV-M-017): the catalog says "a sync read right after
    // `await` may still see the entry". It cannot. `buildInitiate.ts:578-591`
    // attaches the cleanup `.then` at dispatch time, so it is queued ahead of any
    // continuation the caller registers later. The entry is observable while the
    // request is in flight — including from `onQueryStarted` after
    // `await queryFulfilled` — but never after the caller's `await` resumes.
    let registeredAfterQueryFulfilled: unknown = 'not run'
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<null, void>({
          queryFn: async () => {
            await delay(1)
            return { data: null }
          },
          async onQueryStarted(arg, { dispatch, queryFulfilled }) {
            await queryFulfilled
            registeredAfterQueryFulfilled = dispatch(
              api.util.getRunningMutationThunk('update', 'shared'),
            )
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    const promise = store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )

    expect(
      store.dispatch(
        api.util.getRunningMutationThunk('update', promise.requestId),
      ),
    ).toBe(promise)
    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'shared')),
    ).toBe(promise)
    // One promise, two map slots, so it appears twice in the list form.
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([
      promise,
      promise,
    ])

    await promise

    expect(registeredAfterQueryFulfilled).toBe(promise)
    expect(
      store.dispatch(
        api.util.getRunningMutationThunk('update', promise.requestId),
      ),
    ).toBeUndefined()
    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'shared')),
    ).toBeUndefined()
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
  })

  it('INV-M-018: the fixedCacheKey slot is only deleted by the promise that still owns it, so a superseding mutation keeps its registration', async () => {
    const gate = createPromiseFactory()
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<number, number>({
          queryFn: async (n) => {
            await gate.createPromise()
            return { data: n }
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    const first = store.dispatch(
      api.endpoints.update.initiate(1, { fixedCacheKey: 'shared' }),
    )
    const second = store.dispatch(
      api.endpoints.update.initiate(2, { fixedCacheKey: 'shared' }),
    )

    // The later dispatch owns the shared slot.
    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'shared')),
    ).toBe(second)

    gate.resolveOldest()
    await first
    await Promise.resolve()
    await Promise.resolve()

    // `first` settling deletes its own requestId slot unconditionally, but leaves
    // the shared slot alone because `runningMutations.get('shared') !== first`.
    expect(
      store.dispatch(
        api.util.getRunningMutationThunk('update', first.requestId),
      ),
    ).toBeUndefined()
    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'shared')),
    ).toBe(second)

    gate.resolveOldest()
    await second
    await Promise.resolve()
    await Promise.resolve()

    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'shared')),
    ).toBeUndefined()
  })

  it('INV-M-017: `getRunningMutationThunk` returns undefined for a key that was never registered', () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
        }),
      }),
    })
    const { store } = makeStore(api)

    expect(
      store.dispatch(api.util.getRunningMutationThunk('update', 'nope')),
    ).toBeUndefined()
    expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
  })

  it('INV-M-021: the `forceQueryFn` upsert escape hatch is query-only and is ignored by mutations', async () => {
    let baseQueryCalls = 0
    const api = createApi({
      baseQuery: async () => {
        baseQueryCalls++
        return { data: 'from base query' }
      },
      endpoints: (build) => ({
        update: build.mutation<string, void>({ query: () => '/' }),
      }),
    })
    const { store } = makeStore(api)

    // `upsertQueryData` is typed for queries only; reach the symbol the same way
    // the query path does to prove the mutation thunk never reads it.
    const forceQueryFnSymbol = Symbol.for('RTKQ/forceQueryFn')
    const result = await store.dispatch(
      api.endpoints.update.initiate(undefined, {
        [forceQueryFnSymbol]: () => ({ data: 'from forceQueryFn' }),
        // The option is not part of the public mutation options type, which is
        // exactly the point of this invariant.
      } as Parameters<typeof api.endpoints.update.initiate>[1]),
    )

    expect(baseQueryCalls).toBe(1)
    expect(result).toMatchObject({ data: 'from base query' })
  })
})

describe('mutation state & selectors', () => {
  const selectorApi = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      update: build.mutation<null, void>({ queryFn: () => ({ data: null }) }),
    }),
  })

  it('INV-M-022: `.select()` builds a fresh memoized selector every call, so inline use never hits the memo', async () => {
    const { store } = makeStore(selectorApi)
    const promise = store.dispatch(selectorApi.endpoints.update.initiate())
    await promise

    const state = store.getState()

    // Calling `.select()` twice yields two independent selectors…
    const selectorA = selectorApi.endpoints.update.select(promise.requestId)
    const selectorB = selectorApi.endpoints.update.select(promise.requestId)
    expect(selectorA).not.toBe(selectorB)
    expect(selectorA(state)).not.toBe(selectorB(state))
    expect(selectorA(state)).toEqual(selectorB(state))

    // …while a single retained selector memoizes on repeated calls.
    expect(selectorA(state)).toBe(selectorA(state))
  })

  it('INV-M-023: `.select()` with neither a requestId nor a fixedCacheKey resolves to skipToken and returns the uninitialized substate', () => {
    const { store } = makeStore(selectorApi)
    const state = store.getState()

    const skipped = selectorApi.endpoints.update.select({
      requestId: undefined,
      fixedCacheKey: undefined,
    })(state)

    expect(skipped).toMatchObject({
      status: QueryStatus.uninitialized,
      isUninitialized: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })
    // The skipped substate carries no `data` key at all.
    expect('data' in skipped).toBe(false)

    // A miss on a real key produces the same shape, via `defaultMutationSubState`.
    expect(
      selectorApi.endpoints.update.select('never-dispatched')(state),
    ).toEqual(skipped)
  })

  it('INV-M-024: `structuralSharing` is ignored for mutations, so a deep-equal result still yields a new `data` reference', async () => {
    let callCount = 0
    const payload = () => ({ items: [{ id: 1, name: 'same' }] })
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getPosts: build.query<ReturnType<typeof payload>, void>({
          structuralSharing: true,
          queryFn: () => {
            callCount++
            return { data: payload() }
          },
        }),
        // `structuralSharing` lives on `CommonEndpointDefinition`, so a mutation
        // accepts it at the type level. Only the query path in `buildSlice.ts:268`
        // ever reads it.
        update: build.mutation<ReturnType<typeof payload>, void>({
          structuralSharing: true,
          queryFn: () => ({ data: payload() }),
        }),
      }),
    })
    const { store } = makeStore(api)

    const first = store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    await first
    const firstData = store.getState().api.mutations['shared']?.data

    const second = store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    await second
    const secondData = store.getState().api.mutations['shared']?.data

    expect(secondData).toEqual(firstData)
    // `buildSlice.ts:456` assigns `substate.data = payload` with no structural
    // sharing pass, unlike the query path.
    expect(secondData).not.toBe(firstData)

    // Same api config, query endpoint: structural sharing does apply there.
    const queryKey = 'getPosts(undefined)'
    await store.dispatch(api.endpoints.getPosts.initiate())
    const firstQueryData = store.getState().api.queries[queryKey]?.data
    await store.dispatch(
      api.endpoints.getPosts.initiate(undefined, { forceRefetch: true }),
    )
    expect(callCount).toBe(2)
    expect(store.getState().api.queries[queryKey]?.data).toBe(firstQueryData)
  })

  it('INV-M-027: an unhandled throw produces a plain `rejected` action, which invalidates nothing', async () => {
    let queryCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPosts: build.query<number, void>({
          queryFn: () => ({ data: ++queryCount }),
          providesTags: ['Post'],
        }),
        throwing: build.mutation<null, void>({
          queryFn: () => {
            throw new Error('unhandled')
          },
          invalidatesTags: ['Post'],
        }),
        returningError: build.mutation<null, void>({
          queryFn: () => ({ error: { status: 500, data: 'nope' } }),
          invalidatesTags: ['Post'],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(2)
    expect(queryCount).toBe(1)

    await store.dispatch(api.endpoints.throwing.initiate())
    await delay(5)

    const rejectedActions = store
      .getState()
      .actions.filter(
        (action) => action.type === 'api/executeMutation/rejected',
      )
    expect(rejectedActions).toHaveLength(1)
    // Not `rejectedWithValue`, so `isThunkActionWithTags` does not match it.
    expect(rejectedActions[0].meta).toMatchObject({ rejectedWithValue: false })
    expect(queryCount).toBe(1)

    // A returned `error` object goes through `rejectWithValue` and does invalidate.
    await store.dispatch(api.endpoints.returningError.initiate())
    await delay(5)
    expect(queryCount).toBe(2)
  })
})

describe('tag resolution', () => {
  it('INV-M-031: a tag callback returning null or undefined resolves to an empty tag list', async () => {
    let queryCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPosts: build.query<number, void>({
          queryFn: () => ({ data: ++queryCount }),
          // A `providesTags` callback returning nullish must not throw and must
          // register nothing in the tag index.
          providesTags: () => null as never,
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: () => undefined as never,
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(2)
    expect(queryCount).toBe(1)
    expect(store.getState().api.provided.tags).toEqual({})
    expect(store.getState().api.provided.keys).toEqual({
      'getPosts(undefined)': [],
    })

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)
    expect(queryCount).toBe(1)
  })

  it('INV-M-034: `selectInvalidatedBy` looks up a supplied id strictly, so `id: 0` reads the `"0"` bucket rather than the no-id bucket', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        withoutId: build.query<null, void>({
          queryFn: () => ({ data: null }),
          providesTags: ['Post'],
        }),
        withIdOne: build.query<null, void>({
          queryFn: () => ({ data: null }),
          providesTags: [{ type: 'Post', id: 1 }],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.withoutId.initiate())
    store.dispatch(api.endpoints.withIdOne.initiate())
    await delay(2)

    const keysFor = (
      tags: Parameters<typeof api.util.selectInvalidatedBy>[1],
    ) =>
      api.util
        .selectInvalidatedBy(store.getState(), tags)
        .map((entry) => entry.queryCacheKey)
        .sort()

    // No id: `Object.values(provided).flat()` — every bucket for the type.
    expect(keysFor(['Post'])).toEqual([
      'withIdOne(undefined)',
      'withoutId(undefined)',
    ])
    // An explicit id reads only that bucket.
    expect(keysFor([{ type: 'Post', id: 1 }])).toEqual(['withIdOne(undefined)'])
    // `id: 0` is `!== undefined`, so it reads the `"0"` bucket, which is empty —
    // it does *not* fall through to the no-id bucket.
    expect(keysFor([{ type: 'Post', id: 0 }])).toEqual([])
    expect(keysFor([{ type: 'Post', id: '' }])).toEqual([])
  })

  it('INV-M-035: falsy tag ids are written to the no-id bucket but looked up under their own key, so they never invalidate', async () => {
    // SUSPECTED BUG (INV-M-035): the write path uses
    // `draft.tags[type][id || '__internal_without_id']` (buildSlice.ts:500-535)
    // while lookup uses strict `tag.id !== undefined`
    // (buildSelectors.ts:335-374). A tag with `id: 0` or `id: ''` is therefore
    // indexed in the no-id bucket yet queried under its own key, so invalidation
    // never matches. Asserting current behavior to lock the baseline; this is
    // expected to be fixed separately.
    let queryCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPost: build.query<number, void>({
          queryFn: () => ({ data: ++queryCount }),
          providesTags: [{ type: 'Post', id: 0 }],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: [{ type: 'Post', id: 0 }],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.getPost.initiate())
    await delay(2)
    expect(queryCount).toBe(1)

    // The tag landed in the no-id bucket, not under `"0"`.
    expect(store.getState().api.provided.tags).toEqual({
      Post: { __internal_without_id: ['getPost(undefined)'] },
    })

    // Matching tag, no match found.
    expect(
      api.util.selectInvalidatedBy(store.getState(), [{ type: 'Post', id: 0 }]),
    ).toEqual([])
    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)
    expect(queryCount).toBe(1)

    // A type-only invalidation *does* match, because that branch flattens all
    // buckets — so the falsy id behaves like "no id" for reads through that path.
    await store.dispatch(api.util.invalidateTags(['Post']))
    await delay(5)
    expect(queryCount).toBe(2)
  })

  it('INV-M-035: removing a cache entry with a falsy tag id leaks the cache key in the tag index', async () => {
    // SUSPECTED BUG (INV-M-035), removal half: `removeCacheKeyFromTags`
    // (buildSlice.ts:593-613) computes `tag.id ?? '__internal_without_id'`, so
    // for `id: 0` it tries to clean bucket `"0"` — which the write path never
    // used. The stale cache key stays in `__internal_without_id` forever.
    // `selectInvalidatedBy` hides it by filtering keys absent from
    // `state.queries`. Asserting current behavior to lock the baseline.
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        withFalsyId: build.query<null, void>({
          queryFn: () => ({ data: null }),
          providesTags: [{ type: 'Post', id: 0 }],
        }),
        withTruthyId: build.query<null, void>({
          queryFn: () => ({ data: null }),
          providesTags: [{ type: 'Post', id: 7 }],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(
      api.endpoints.withFalsyId.initiate(undefined, { subscribe: false }),
    )
    store.dispatch(
      api.endpoints.withTruthyId.initiate(undefined, { subscribe: false }),
    )
    await delay(2)

    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: 'withFalsyId(undefined)' as never,
      }),
    )
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: 'withTruthyId(undefined)' as never,
      }),
    )

    // `keys` is cleaned for both.
    expect(store.getState().api.provided.keys).toEqual({})
    // The truthy id is cleaned out of its bucket; the falsy one leaks.
    expect(store.getState().api.provided.tags).toEqual({
      Post: {
        '7': [],
        __internal_without_id: ['withFalsyId(undefined)'],
      },
    })
    // The leak is invisible through the selector, because the dangling key is
    // filtered out of the result.
    expect(api.util.selectInvalidatedBy(store.getState(), ['Post'])).toEqual([])
  })

  it('INV-M-038: `invalidatesTags` on a query definition is inert', async () => {
    let providerCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: ['Post'],
        }),
        // `invalidatesTags` is not part of the query definition's public type;
        // `isThunkActionWithTags` only matches `mutationThunk`, so even when it
        // is present the query end never invalidates.
        invalidatingQuery: build.query<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        } as never),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.provider.initiate())
    await delay(2)
    expect(providerCount).toBe(1)

    await store.dispatch(api.endpoints.invalidatingQuery.initiate())
    await delay(5)

    expect(providerCount).toBe(1)
  })
})

describe('invalidation dispatch & deferral', () => {
  /**
   * `provider` provides 'Post', `unrelated` provides nothing, `update` invalidates
   * 'Post'. Every endpoint settles only when the test says so, which is how
   * `raceConditions.test.ts` isolates deferral timing.
   */
  function setupDeferralApi(
    invalidationBehavior: 'delayed' | 'immediately' = 'delayed',
  ) {
    const providerGate = createPromiseFactory()
    const unrelatedGate = createPromiseFactory()
    const mutationGate = createPromiseFactory()
    let providerCount = 0
    let secondProviderCount = 0

    const api = createApi({
      invalidationBehavior,
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post', 'Other'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: async () => {
            const result = ++providerCount
            await providerGate.createPromise()
            return { data: result }
          },
          providesTags: ['Post'],
        }),
        secondProvider: build.query<number, void>({
          queryFn: () => ({ data: ++secondProviderCount }),
          providesTags: ['Post'],
        }),
        unrelated: build.query<null, void>({
          queryFn: async () => {
            await unrelatedGate.createPromise()
            return { data: null }
          },
          providesTags: ['Other'],
        }),
        update: build.mutation<null, void>({
          queryFn: async () => {
            await mutationGate.createPromise()
            return { data: null }
          },
          invalidatesTags: ['Post'],
        }),
      }),
    })

    return {
      ...makeStore(api),
      providerGate,
      unrelatedGate,
      mutationGate,
      counts: {
        get provider() {
          return providerCount
        },
        get secondProvider() {
          return secondProviderCount
        },
      },
    }
  }

  it('INV-M-041, INV-M-043: the deferral queue is drained by any thunk settling, not just the deferring one', async () => {
    const { api, store, providerGate, unrelatedGate, mutationGate, counts } =
      setupDeferralApi()

    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)

    // An unrelated request is now in flight, so `hasPendingRequests()` is true.
    store.dispatch(api.endpoints.unrelated.initiate())
    await delay(2)

    // The mutation settles, but the invalidation is only queued.
    const mutation = store.dispatch(api.endpoints.update.initiate())
    mutationGate.resolveOldest()
    await mutation
    await delay(5)
    expect(counts.provider).toBe(1)

    // Settling the *unrelated* query drains the queue: `isQueryEnd` calls
    // `invalidateTags([])` purely to re-run the flush check
    // (invalidationByTags.ts:70-71). There is no timer and no other drain path.
    unrelatedGate.resolveOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  it('INV-M-043, INV-M-050: the queue is swapped for a fresh array before dispatching, so the refetches it starts do not re-enter it', async () => {
    const { api, store, providerGate, mutationGate, counts } =
      setupDeferralApi()

    store.dispatch(api.endpoints.provider.initiate())
    store.dispatch(api.endpoints.secondProvider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)
    expect(counts.secondProvider).toBe(1)

    const mutation = store.dispatch(api.endpoints.update.initiate())
    mutationGate.resolveOldest()
    await mutation
    await delay(5)

    // Both providers refetch exactly once. `secondProvider` resolves immediately,
    // and its `fulfilled` action runs another flush check — against the fresh
    // empty array, so it finds nothing and does not refetch anybody again.
    providerGate.resolveOldest()
    await delay(10)
    expect(counts.provider).toBe(2)
    expect(counts.secondProvider).toBe(2)
  })

  it('INV-M-044: `api.util.invalidateTags` is subject to the same deferral as a mutation', async () => {
    const { api, store, providerGate, unrelatedGate, counts } =
      setupDeferralApi()

    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)

    store.dispatch(api.endpoints.unrelated.initiate())
    await delay(2)

    // Manual invalidation routes through the same `invalidateTags()` function, so
    // under 'delayed' with a request in flight it does nothing yet.
    store.dispatch(api.util.invalidateTags(['Post']))
    await delay(5)
    expect(counts.provider).toBe(1)

    unrelatedGate.resolveOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  it('INV-M-044: under `invalidationBehavior: "immediately"` a manual invalidation is not deferred', async () => {
    const { api, store, providerGate, counts } = setupDeferralApi('immediately')

    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)

    store.dispatch(api.endpoints.unrelated.initiate())
    await delay(2)

    store.dispatch(api.util.invalidateTags(['Post']))
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  it('INV-M-045: a manual invalidation expands string tags and drops nullish entries', async () => {
    let providerCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: [{ type: 'Post', id: 1 }],
        }),
      }),
    })
    const { store } = makeStore(api)

    store.dispatch(api.endpoints.provider.initiate())
    await delay(2)
    expect(providerCount).toBe(1)

    // `calculateProvidedBy(action.payload, undefined, undefined, undefined,
    // undefined, assertTagType)` — the payload is used directly as the tag
    // description, so nullish entries are filtered and bare strings expand to
    // `{ type }`.
    store.dispatch(api.util.invalidateTags([null, undefined]))
    await delay(5)
    expect(providerCount).toBe(1)

    store.dispatch(api.util.invalidateTags([null, 'Post', undefined]))
    await delay(5)
    expect(providerCount).toBe(2)
  })

  it('INV-M-046, INV-M-047, INV-M-052: an invalidated entry with zero subscribers is deleted, not refetched, and leaves no subscription-map entry behind', async () => {
    let providerCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: ['Post'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        }),
      }),
    })
    const { store } = makeStore(api)

    // `subscribe: false` is what `prefetch` and `refetchQuery` both use, so this
    // is the state a prefetched entry sits in.
    await store.dispatch(
      api.endpoints.provider.initiate(undefined, { subscribe: false }),
    )
    await delay(2)
    expect(providerCount).toBe(1)
    expect(store.getState().api.queries['provider(undefined)']?.data).toBe(1)

    // INV-M-052: GC is timer-driven (`keepUnusedDataFor` defaults to 60s), so the
    // entry is still in state when the invalidation flush inspects it, even
    // though `cacheCollection` runs before `invalidationByTags` in the handler
    // array.
    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)

    // Zero subscribers, so `removeQueryResult` wins over `refetchQuery`.
    expect(store.getState().api.queries['provider(undefined)']).toBeUndefined()
    expect(providerCount).toBe(1)
    expect(store.getState().api.provided.keys).toEqual({})

    // INV-M-047: the flush reads `internalState.currentSubscriptions` through
    // `getOrInsertComputed`, which inserts an empty `Map` as a side effect. The
    // `removeQueryResult` it then dispatches deletes that entry again, so no
    // orphan is left. (The transient insert is not separately observable.)
    const subscriptions = store.dispatch(
      api.internalActions.internal_getRTKQSubscriptions(),
    ) as unknown as { getSubscriptions(): Map<string, Map<string, unknown>> }
    expect(subscriptions.getSubscriptions().has('provider(undefined)')).toBe(
      false,
    )
  })

  it('INV-M-046: an invalidated entry with a live subscriber is refetched rather than deleted', async () => {
    let providerCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: ['Post'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        }),
      }),
    })
    const { store } = makeStore(api)

    const subscription = store.dispatch(api.endpoints.provider.initiate())
    await subscription
    expect(providerCount).toBe(1)

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)

    expect(providerCount).toBe(2)
    expect(store.getState().api.queries['provider(undefined)']?.data).toBe(2)
    subscription.unsubscribe()
  })

  it('INV-M-049: `context.batch` is a no-op outside the React module, so each refetch dispatched by a flush notifies subscribers separately', async () => {
    let providerCount = 0
    let secondProviderCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: ['Post'],
        }),
        secondProvider: build.query<number, void>({
          queryFn: () => ({ data: ++secondProviderCount }),
          providesTags: ['Post'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        }),
      }),
    })

    let lastActionType = ''
    const recorder: Middleware = () => (next) => (action) => {
      lastActionType = (action as { type: string }).type
      return next(action)
    }
    const { store } = setupApiStore(
      api,
      { ...actionsReducer },
      { withoutTestLifecycles: true, middleware: { prepend: [recorder] } },
    )

    const notified: string[] = []
    const first = store.dispatch(api.endpoints.provider.initiate())
    const second = store.dispatch(api.endpoints.secondProvider.initiate())
    await Promise.all([first, second])

    store.subscribe(() => notified.push(lastActionType))

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)

    expect(providerCount).toBe(2)
    expect(secondProviderCount).toBe(2)
    // Two refetches, two separate notifications. React consumers get one render
    // here because `react/module.ts` swaps `context.batch` for react-redux's
    // `batch`; core consumers get N.
    expect(
      notified.filter((type) => type === 'api/executeQuery/pending'),
    ).toHaveLength(2)

    first.unsubscribe()
    second.unsubscribe()
  })

  it('INV-M-051: tag-triggered refetches are dispatched before `queryFulfilled` resolves for the same mutation', async () => {
    let actionsAtQueryFulfilled: string[] = []
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<null, void>({
          queryFn: () => ({ data: null }),
          providesTags: ['Post'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
          async onQueryStarted(arg, { queryFulfilled, getState }) {
            await queryFulfilled
            // RTKQ types `getState` as its own `RootState`, which knows nothing
            // about the `actionsReducer` slice `setupApiStore` adds alongside it.
            const { actions } = getState() as unknown as {
              actions: UnknownAction[]
            }
            actionsAtQueryFulfilled = actions
              .map((action) => action.type)
              .filter((type) => type === 'api/executeQuery/pending')
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    const subscription = store.dispatch(api.endpoints.provider.initiate())
    await subscription
    expect(actionsAtQueryFulfilled).toEqual([])

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)

    // `invalidationByTags` sits at index 2 of the handler array and
    // `queryLifecycle` at index 5 (buildMiddleware/index.ts:60-67), so by the time
    // the awaiting user code runs, the refetch has already been dispatched.
    expect(actionsAtQueryFulfilled).toHaveLength(2)
    subscription.unsubscribe()
  })

  it('INV-M-053: actions that are not part of the api slice skip every middleware handler, so they cannot drain the queue', async () => {
    const { api, store, providerGate, unrelatedGate, mutationGate, counts } =
      setupDeferralApi()

    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)

    store.dispatch(api.endpoints.unrelated.initiate())
    await delay(2)

    const mutation = store.dispatch(api.endpoints.update.initiate())
    mutationGate.resolveOldest()
    await mutation
    await delay(5)
    expect(counts.provider).toBe(1)

    // The gate at `buildMiddleware/index.ts:127-136` requires
    // `isThisApiSliceAction(action) || context.hasRehydrationInfo(action)`, so
    // foreign actions never reach `invalidationByTags` at all.
    for (let i = 0; i < 5; i++) {
      store.dispatch({ type: 'someOtherSlice/somethingHappened' })
    }
    await delay(5)
    expect(counts.provider).toBe(1)

    unrelatedGate.resolveOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  it('INV-M-054: `resetApiState` does not clear the deferral state; queued tags flush against the post-reset tag index', async () => {
    const { api, store, providerGate, unrelatedGate, mutationGate, counts } =
      setupDeferralApi()

    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(1)

    // A request in flight keeps `hasPendingRequests()` true.
    store.dispatch(api.endpoints.unrelated.initiate())
    await delay(2)

    const mutation = store.dispatch(api.endpoints.update.initiate())
    mutationGate.resolveOldest()
    await mutation
    await delay(5)
    expect(counts.provider).toBe(1)

    // `invalidationByTags` has no `resetApiState` branch, unlike
    // `cacheCollection.ts:116-124` and `batchActions.ts`. Both
    // `pendingTagInvalidations` and `pendingRequestCount` are middleware-closure
    // `let`s and survive the reset.
    store.dispatch(api.util.resetApiState())
    await delay(5)

    // The aborted `unrelated` query dispatches `rejected`, which decrements the
    // counter back to zero, so the queue drains against the now-empty tag index
    // and matches nothing. `pendingRequestCount` self-corrects this way.
    expect(store.getState().api.provided.tags).toEqual({})
    expect(counts.provider).toBe(1)

    // Invalidation still works afterwards, which is what "self-corrects" means:
    // the counter is not wedged above zero.
    store.dispatch(api.endpoints.provider.initiate())
    providerGate.resolveOldest()
    await delay(2)
    expect(counts.provider).toBe(2)

    const secondMutation = store.dispatch(api.endpoints.update.initiate())
    mutationGate.resolveOldest()
    await secondMutation
    await delay(5)
    expect(counts.provider).toBe(3)

    unrelatedGate.resolveOldest()
    providerGate.resolveOldest()
    await delay(5)
  })
})

describe('cache manipulation utils', () => {
  /** A plain class instance is not draftable by Immer. */
  class Counter {
    constructor(public value: number) {}
  }

  it('INV-M-057: a recipe that produces no change skips the dispatch entirely', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPost: build.query<{ name: string }, void>({
          queryFn: () => ({ data: { name: 'original' } }),
          providesTags: ['Post'],
        }),
      }),
    })
    const { store } = makeStore(api)

    const subscription = store.dispatch(api.endpoints.getPost.initiate())
    await subscription
    const dataBefore = store.getState().api.queries['getPost(undefined)']?.data
    const actionsBefore = store.getState().actions.length

    const patchResult = store.dispatch(
      api.util.updateQueryData('getPost', undefined, (draft) => {
        draft.name = 'original'
      }),
    )

    expect(patchResult.patches).toEqual([])
    expect(patchResult.inversePatches).toEqual([])
    // No `queryResultPatched`, and no `updateProvidedBy` either — so provided
    // tags are not recalculated in this case even though `updateProvided`
    // defaults to `true`.
    expect(store.getState().actions.length).toBe(actionsBefore)
    expect(store.getState().api.queries['getPost(undefined)']?.data).toBe(
      dataBefore,
    )
    subscription.unsubscribe()
  })

  it('INV-M-058: non-draftable cache data is replaced wholesale via a root-level `replace` patch, and a mutation-style recipe sets it to undefined', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getCount: build.query<number, void>({ queryFn: () => ({ data: 1 }) }),
        getInstance: build.query<Counter, void>({
          queryFn: () => ({ data: new Counter(1) }),
        }),
      }),
    })
    const { store } = makeStore(api)

    const countSub = store.dispatch(api.endpoints.getCount.initiate())
    const instanceSub = store.dispatch(api.endpoints.getInstance.initiate())
    await Promise.all([countSub, instanceSub])

    // A primitive: the recipe's *return value* is used, not draft mutation.
    const numberPatch = store.dispatch(
      api.util.updateQueryData('getCount', undefined, () => 42),
    )
    expect(numberPatch.patches).toEqual([
      { op: 'replace', path: [], value: 42 },
    ])
    expect(numberPatch.inversePatches).toEqual([
      { op: 'replace', path: [], value: 1 },
    ])
    expect(store.getState().api.queries['getCount(undefined)']?.data).toBe(42)

    numberPatch.undo()
    expect(store.getState().api.queries['getCount(undefined)']?.data).toBe(1)

    // A plain class instance is also non-draftable. The recipe receives the real
    // cached object, which Immer's autoFreeze has already frozen, so a recipe
    // written as a draft mutation throws rather than silently doing nothing.
    expect(() =>
      store.dispatch(
        api.util.updateQueryData('getInstance', undefined, (draft) => {
          draft.value = 2
        }),
      ),
    ).toThrowError(/read only property/)

    // A recipe that only reads returns `undefined`, and that `undefined` is what
    // gets written — this is the silent data loss the invariant describes.
    const instancePatch = store.dispatch(
      api.util.updateQueryData('getInstance', undefined, (draft) => {
        void draft.value
      }),
    )
    expect(instancePatch.patches).toEqual([
      { op: 'replace', path: [], value: undefined },
    ])
    expect(
      store.getState().api.queries['getInstance(undefined)']?.data,
    ).toBeUndefined()

    countSub.unsubscribe()
    instanceSub.unsubscribe()
  })

  it('INV-M-059: `undo()` reads `ret.inversePatches` by reference at call time, not from a snapshot', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getPost: build.query<{ name: string; extra?: string }, void>({
          queryFn: () => ({ data: { name: 'original' } }),
        }),
      }),
    })
    const { store } = makeStore(api)

    const subscription = store.dispatch(api.endpoints.getPost.initiate())
    await subscription

    const patchResult = store.dispatch(
      api.util.updateQueryData('getPost', undefined, (draft) => {
        draft.name = 'patched'
      }),
    )
    expect(store.getState().api.queries['getPost(undefined)']?.data).toEqual({
      name: 'patched',
    })

    // Mutating the array after the fact changes what `undo()` applies, because the
    // closure captured `ret`, not `ret.inversePatches`.
    patchResult.inversePatches.push({
      op: 'replace',
      path: ['extra'],
      value: 'injected',
    })
    patchResult.undo()

    expect(store.getState().api.queries['getPost(undefined)']?.data).toEqual({
      name: 'original',
      extra: 'injected',
    })
    subscription.unsubscribe()
  })

  it('INV-M-062: tag recalculation after a patch passes `(newData, undefined, arg, {})`, so `meta` is an empty object', async () => {
    const providesTagsCalls: Array<{
      result: unknown
      error: unknown
      arg: unknown
      meta: unknown
    }> = []

    const api = createApi({
      baseQuery: async () => ({
        data: { name: 'original' },
        meta: { response: 'from transport' },
      }),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPost: build.query<{ name: string }, number>({
          query: (id) => `${id}`,
          providesTags: (result, error, arg, meta) => {
            providesTagsCalls.push({ result, error, arg, meta })
            return ['Post']
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    const subscription = store.dispatch(api.endpoints.getPost.initiate(7))
    await subscription

    expect(providesTagsCalls).toHaveLength(1)
    expect(providesTagsCalls[0]).toEqual({
      result: { name: 'original' },
      error: undefined,
      arg: 7,
      meta: { response: 'from transport' },
    })

    store.dispatch(
      api.util.updateQueryData('getPost', 7, (draft) => {
        draft.name = 'patched'
      }),
    )

    expect(providesTagsCalls).toHaveLength(2)
    // `error` is `undefined` and `meta` is `{}` rather than the original
    // `baseQueryMeta` — a `providesTags` function reading `meta.response.headers`
    // would throw here.
    expect(providesTagsCalls[1]).toEqual({
      result: { name: 'patched' },
      error: undefined,
      arg: 7,
      meta: {},
    })
    subscription.unsubscribe()
  })

  it('INV-M-065: upserted entries are never registered in `runningQueries`, so `getRunningQueriesThunk` does not await them', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        getPost: build.query<{ name: string }, number>({
          queryFn: async () => {
            await delay(1)
            return { data: { name: 'fetched' } }
          },
        }),
      }),
    })
    const { store } = makeStore(api)

    // A real fetch registers itself.
    const fetching = store.dispatch(api.endpoints.getPost.initiate(1))
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([
      fetching,
    ])
    expect(store.dispatch(api.util.getRunningQueryThunk('getPost', 1))).toBe(
      fetching,
    )
    await fetching

    // An upsert does not, because of the `&& !forceQueryFn` guard at
    // `buildInitiate.ts:510-517`.
    const upserting = store.dispatch(
      api.util.upsertQueryData('getPost', 2, { name: 'upserted' }),
    )
    expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    expect(
      store.dispatch(api.util.getRunningQueryThunk('getPost', 2)),
    ).toBeUndefined()

    // The write is asynchronous, so an SSR `await Promise.all(getRunningQueries)`
    // can serialize state before it lands.
    expect(store.getState().api.queries['getPost(2)']?.data).toBeUndefined()
    await upserting
    expect(store.getState().api.queries['getPost(2)']?.data).toEqual({
      name: 'upserted',
    })
  })
})
