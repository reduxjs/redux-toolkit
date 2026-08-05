/**
 * SPIKE (v3 immutability adapters): runs a real RTK Query api on the
 * Mutative-backed adapter instead of Immer. Exercises the full Immer surface
 * that RTKQ's query core uses internally:
 *
 * - case reducers in the six internal slices (drafts come from Mutative)
 * - `updateQueryData` optimistic patches + `undo` (produceWithPatches /
 *   applyPatches reciprocity across dispatch)
 * - structural sharing on refetch (`original` on a draft)
 * - the `merge` option (nested `produce` with a draft base)
 * - subscription state syncing (patch diff in the middleware, applied by the
 *   `subscriptionsUpdated` case reducer)
 * - `resetApiState`
 *
 * Also verifies that `createApi` rejects adapters without `patches` support.
 *
 * Note: Mutative logs an unconditional warning when a recipe *returns* an
 * object instead of mutating the draft (it suggests `rawReturn()`). The
 * subscription-sync diff in `batchActions.ts` is a returning recipe, so that
 * path spies on `console.warn`.
 */
import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query'
import { mutativeAdapter, mutativeAdapterWithPatches } from '../../v3/mutativeAdapter'

interface Post {
  id: string
  title: string
  contents: string
}

const posts: Record<string, Post> = {}

const baseQuery = vi.fn(async (arg: any) => {
  if (typeof arg === 'string' && arg.startsWith('post/')) {
    return { data: { ...posts[arg.replace('post/', '')] } }
  }
  return { data: arg }
})

function buildApi() {
  return createApi({
    reducerPath: 'mutativeApi',
    baseQuery,
    immutability: mutativeAdapterWithPatches,
    tagTypes: ['Post'],
    endpoints: (build) => ({
      post: build.query<Post, string>({
        query: (id) => `post/${id}`,
        providesTags: ['Post'],
      }),
      pagedList: build.query<{ items: number[] }, { items: number[] }>({
        query: (arg) => arg,
        // exercise the nested produce-on-draft merge path
        serializeQueryArgs: () => 'pagedList',
        merge: (currentCache, newItems) => {
          currentCache.items.push(...newItems.items)
        },
        forceRefetch: () => true,
      }),
    }),
  })
}

function buildStore(api: ReturnType<typeof buildApi>) {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) =>
      gDM({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })
}

beforeEach(() => {
  baseQuery.mockClear()
  posts['1'] = { id: '1', title: 'First post', contents: 'hello' }
})

describe('RTKQ on the mutative adapter', () => {
  test('createApi rejects an adapter without patches support', () => {
    expect(() =>
      createApi({
        baseQuery,
        immutability: mutativeAdapter,
        endpoints: (build) => ({
          one: build.query<number, void>({ query: () => 'one' }),
        }),
      }),
    ).toThrowError(/requires an immutability adapter with `patches` support/)
  })

  test('basic query: fetch succeeds, cache data is frozen by mutative', async () => {
    const api = buildApi()
    const store = buildStore(api)

    const result = await store.dispatch(api.endpoints.post.initiate('1'))
    expect(result.data).toEqual(posts['1'])

    const cached = api.endpoints.post.select('1')(store.getState())
    expect(cached.data).toEqual(posts['1'])
    expect(Object.isFrozen(cached.data)).toBe(true)
  })

  test('structural sharing: refetching identical data keeps identity', async () => {
    const api = buildApi()
    const store = buildStore(api)

    await store.dispatch(api.endpoints.post.initiate('1'))
    const first = api.endpoints.post.select('1')(store.getState()).data

    await store.dispatch(
      api.endpoints.post.initiate('1', { forceRefetch: true }),
    )
    const second = api.endpoints.post.select('1')(store.getState()).data

    expect(baseQuery).toHaveBeenCalledTimes(2)
    expect(second).toBe(first)
  })

  test('updateQueryData: optimistic patch applies and undo restores', async () => {
    const api = buildApi()
    const store = buildStore(api)

    await store.dispatch(api.endpoints.post.initiate('1'))
    const before = api.endpoints.post.select('1')(store.getState()).data

    const { undo, patches, inversePatches } = store.dispatch(
      api.util.updateQueryData('post', '1', (draft) => {
        draft.title = 'Optimistic title'
      }),
    )
    expect(patches.length).toBeGreaterThan(0)
    expect(inversePatches.length).toBeGreaterThan(0)

    const updated = api.endpoints.post.select('1')(store.getState()).data
    expect(updated).toMatchObject({ title: 'Optimistic title' })
    expect(updated).not.toBe(before)

    undo()

    const restored = api.endpoints.post.select('1')(store.getState()).data
    expect(restored).toEqual(before)
  })

  test('merge option: nested produce with a draft base', async () => {
    const api = buildApi()
    const store = buildStore(api)

    await store.dispatch(api.endpoints.pagedList.initiate({ items: [1, 2] }))
    await store.dispatch(api.endpoints.pagedList.initiate({ items: [3, 4] }))

    const cached = api.endpoints.pagedList.select({ items: [] })(
      store.getState(),
    )
    expect(cached.data).toEqual({ items: [1, 2, 3, 4] })
  })

  test('subscription sync: middleware patch diff round-trips through the reducer', async () => {
    vi.useFakeTimers()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = buildApi()
      const store = buildStore(api)

      const promise = store.dispatch(
        api.endpoints.post.initiate('1', { subscribe: true }),
      )
      await vi.runAllTimersAsync()
      await promise

      const subscriptions = (store.getState() as any)[api.reducerPath]
        .subscriptions
      const cacheKey = Object.keys(subscriptions)[0]
      expect(cacheKey).toContain('post')
      expect(Object.keys(subscriptions[cacheKey]).length).toBeGreaterThan(0)
    } finally {
      warnSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  test('resetApiState clears everything back to initial state', async () => {
    const api = buildApi()
    const store = buildStore(api)

    await store.dispatch(api.endpoints.post.initiate('1'))
    expect(
      api.endpoints.post.select('1')(store.getState()).data,
    ).toBeDefined()

    store.dispatch(api.util.resetApiState())
    expect(
      api.endpoints.post.select('1')(store.getState()).data,
    ).toBeUndefined()
  })
})
