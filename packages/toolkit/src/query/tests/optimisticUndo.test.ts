import { createEntityAdapter } from '@reduxjs/toolkit'
import type { QueryCacheKey } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'

interface Post {
  id: number
  title: string
  contents: string
}

const original: Post = { id: 1, title: 'original', contents: 'contents' }
const postsAdapter = createEntityAdapter<Post>()
let serverTitle = original.title

const api = createApi({
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      queryFn: (id) => ({ data: { ...original, id, title: serverTitle } }),
    }),
    getPosts: build.query<Post[], void>({
      queryFn: () => ({ data: [original, { ...original, id: 2 }] }),
      providesTags: (result) =>
        result?.map(({ id }) => ({ type: 'Post', id })) ?? [],
    }),
    getNormalizedPosts: build.query<
      ReturnType<typeof postsAdapter.getInitialState>,
      void
    >({
      queryFn: () => ({
        data: postsAdapter.setAll(postsAdapter.getInitialState(), [original]),
      }),
    }),
    getCount: build.query<number, void>({ queryFn: () => ({ data: 1 }) }),
  }),
})

const storeRef = setupApiStore(api, { ...actionsReducer })
const selectPost = () =>
  api.endpoints.getPost.select(1)(storeRef.store.getState())

beforeEach(() => {
  serverTitle = original.title
})

describe('undo', () => {
  test.each([undefined, {}, { ifUnchanged: false }, { ifUnchanged: true }])(
    'reverts unchanged data with options %j',
    async (options) => {
      const { store } = storeRef
      await store.dispatch(api.endpoints.getPost.initiate(1))
      const patch = store.dispatch(
        api.util.updateQueryData('getPost', 1, (draft) => {
          draft.title = 'optimistic'
        }),
      )
      expect(selectPost().data?.title).toBe('optimistic')

      patch.undo(options)
      expect(selectPost().data).toEqual(original)
    },
  )

  test.each(['refetch', 'update', 'upsert'] as const)(
    'preserves newer data after %s without dispatching actions',
    async (write) => {
      const { store } = storeRef
      await store.dispatch(api.endpoints.getPost.initiate(1))
      const patch = store.dispatch(
        api.util.updateQueryData('getPost', 1, (draft) => {
          draft.title = 'optimistic'
        }),
      )
      if (write === 'refetch') {
        serverTitle = 'newer'
        await store.dispatch(
          api.endpoints.getPost.initiate(1, { forceRefetch: true }),
        )
      } else if (write === 'update') {
        store.dispatch(
          api.util.updateQueryData('getPost', 1, (draft) => {
            draft.contents = 'newer'
          }),
        )
      } else {
        await store.dispatch(
          api.util.upsertQueryData('getPost', 1, {
            ...original,
            title: 'newer',
          }),
        )
      }
      const latest = selectPost().data
      const actionsBefore = store.getState().actions.length

      patch.undo({ ifUnchanged: true })
      expect(selectPost().data).toBe(latest)
      expect(store.getState().actions).toHaveLength(actionsBefore)
    },
  )

  test.each([undefined, {}, { ifUnchanged: false }])(
    'retains unconditional rollback with options %j',
    async (options) => {
      const { store } = storeRef
      await store.dispatch(api.endpoints.getPost.initiate(1))
      const patch = store.dispatch(
        api.util.updateQueryData('getPost', 1, (draft) => {
          draft.title = 'optimistic'
        }),
      )
      serverTitle = 'newer'
      await store.dispatch(
        api.endpoints.getPost.initiate(1, { forceRefetch: true }),
      )
      expect(selectPost().data?.title).toBe('newer')

      patch.undo(options)
      expect(selectPost().data).toEqual(original)
    },
  )

  test.each(['missing', 'unchanged'] as const)(
    'does not dispatch a guarded undo for a %s update',
    async (scenario) => {
      const { store } = storeRef
      if (scenario === 'unchanged') {
        await store.dispatch(api.endpoints.getPost.initiate(1))
      }
      const recipe = vi.fn((draft: Post) => {
        draft.title = 'original'
      })
      const patch = store.dispatch(
        api.util.updateQueryData('getPost', 1, recipe),
      )
      expect(recipe).toHaveBeenCalledTimes(scenario === 'missing' ? 0 : 1)
      expect(patch.patches).toEqual([])
      const actionsBefore = store.getState().actions.length

      patch.undo({ ifUnchanged: true })
      expect(store.getState().actions).toHaveLength(actionsBefore)
    },
  )

  test('checks only the patched cache entry', async () => {
    const { store } = storeRef
    await store.dispatch(api.endpoints.getPost.initiate(1))
    const patch = store.dispatch(
      api.util.updateQueryData('getPost', 1, (draft) => {
        draft.title = 'optimistic'
      }),
    )
    await store.dispatch(api.endpoints.getPost.initiate(2))

    patch.undo({ ifUnchanged: true })
    expect(selectPost().data).toEqual(original)
    expect(api.endpoints.getPost.select(2)(store.getState()).data).toEqual({
      ...original,
      id: 2,
    })
  })

  test('allows rollback after a refetch that preserves the data reference', async () => {
    const { store } = storeRef
    await store.dispatch(api.endpoints.getPost.initiate(1))
    const patch = store.dispatch(
      api.util.updateQueryData('getPost', 1, (draft) => {
        draft.title = 'optimistic'
      }),
    )
    const patched = selectPost().data
    serverTitle = 'optimistic'
    await store.dispatch(
      api.endpoints.getPost.initiate(1, { forceRefetch: true }),
    )
    expect(selectPost().data).toBe(patched)

    patch.undo({ ifUnchanged: true })
    expect(selectPost().data).toEqual(original)
  })

  test.each(['remove', 'reset'] as const)(
    'skips rollback after cache %s',
    async (action) => {
      const { store } = storeRef
      const request = store.dispatch(api.endpoints.getPost.initiate(1))
      await request
      const patch = store.dispatch(
        api.util.updateQueryData('getPost', 1, (draft) => {
          draft.title = 'optimistic'
        }),
      )
      store.dispatch(
        action === 'remove'
          ? api.internalActions.removeQueryResult({
              queryCacheKey: request.queryCacheKey as QueryCacheKey,
            })
          : api.util.resetApiState(),
      )
      const actionsBefore = store.getState().actions.length

      patch.undo({ ifUnchanged: true })
      expect(selectPost().isUninitialized).toBe(true)
      expect(store.getState().actions).toHaveLength(actionsBefore)
    },
  )

  test('does not apply old patches to a recreated entry', async () => {
    const { store } = storeRef
    const request = store.dispatch(api.endpoints.getPost.initiate(1))
    await request
    const patch = store.dispatch(
      api.util.updateQueryData('getPost', 1, (draft) => {
        draft.title = 'optimistic'
      }),
    )
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: request.queryCacheKey as QueryCacheKey,
      }),
    )
    serverTitle = 'newer'
    await store.dispatch(api.endpoints.getPost.initiate(1))
    expect(selectPost().data?.title).toBe('newer')

    patch.undo({ ifUnchanged: true })
    expect(selectPost().data?.title).toBe('newer')
  })

  test('does not apply inverse array patches to shifted indexes', async () => {
    const { store } = storeRef
    await store.dispatch(api.endpoints.getPosts.initiate())
    const patch = store.dispatch(
      api.util.updateQueryData('getPosts', undefined, (draft) => {
        draft[1].title = 'optimistic'
      }),
    )
    store.dispatch(
      api.util.updateQueryData('getPosts', undefined, (draft) => {
        draft.shift()
      }),
    )

    expect(() => patch.undo({ ifUnchanged: true })).not.toThrow()
    expect(api.endpoints.getPosts.select()(store.getState()).data).toEqual([
      { ...original, id: 2, title: 'optimistic' },
    ])
  })

  test('does not resurrect an entity removed after an optimistic update', async () => {
    const { store } = storeRef
    await store.dispatch(api.endpoints.getNormalizedPosts.initiate())
    const patch = store.dispatch(
      api.util.updateQueryData('getNormalizedPosts', undefined, (draft) => {
        postsAdapter.updateOne(draft, {
          id: 1,
          changes: { title: 'optimistic' },
        })
      }),
    )
    store.dispatch(
      api.util.updateQueryData('getNormalizedPosts', undefined, (draft) => {
        postsAdapter.removeOne(draft, 1)
      }),
    )

    expect(() => patch.undo({ ifUnchanged: true })).not.toThrow()
    expect(
      api.endpoints.getNormalizedPosts.select()(store.getState()).data,
    ).toEqual({
      ids: [],
      entities: {},
    })
  })

  test.each([false, true])(
    'preserves updateProvided=%s when reverting',
    async (updateProvided) => {
      const { store } = storeRef
      await store.dispatch(api.endpoints.getPosts.initiate())
      const patch = store.dispatch(
        api.util.updateQueryData(
          'getPosts',
          undefined,
          (draft) => {
            draft.push({ ...original, id: 3 })
          },
          updateProvided,
        ),
      )
      expect(
        api.util.selectInvalidatedBy(store.getState(), [
          { type: 'Post', id: 3 },
        ]),
      ).toHaveLength(updateProvided ? 1 : 0)

      patch.undo({ ifUnchanged: true })
      expect(
        api.endpoints.getPosts.select()(store.getState()).data,
      ).toHaveLength(2)
      expect(
        api.util.selectInvalidatedBy(store.getState(), [
          { type: 'Post', id: 3 },
        ]),
      ).toHaveLength(0)
    },
  )

  test('compares primitive values when deciding whether to roll back', async () => {
    const { store } = storeRef
    await store.dispatch(api.endpoints.getCount.initiate())
    const patch = store.dispatch(
      api.util.updateQueryData('getCount', undefined, () => 2),
    )

    patch.undo({ ifUnchanged: true })
    expect(api.endpoints.getCount.select()(store.getState()).data).toBe(1)

    const nextPatch = store.dispatch(
      api.util.updateQueryData('getCount', undefined, () => 2),
    )
    store.dispatch(api.util.updateQueryData('getCount', undefined, () => 3))
    nextPatch.undo({ ifUnchanged: true })
    expect(api.endpoints.getCount.select()(store.getState()).data).toBe(3)
  })

  test('distinguishes undefined data from a removed entry', async () => {
    const { store } = storeRef
    const request = store.dispatch(api.endpoints.getCount.initiate())
    await request
    const patch = store.dispatch(
      api.util.updateQueryData('getCount', undefined, () => undefined),
    )
    expect(
      api.endpoints.getCount.select()(store.getState()).data,
    ).toBeUndefined()

    patch.undo({ ifUnchanged: true })
    expect(api.endpoints.getCount.select()(store.getState()).data).toBe(1)

    const removedPatch = store.dispatch(
      api.util.updateQueryData('getCount', undefined, () => undefined),
    )
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: request.queryCacheKey as QueryCacheKey,
      }),
    )
    const actionsBefore = store.getState().actions.length
    removedPatch.undo({ ifUnchanged: true })
    expect(
      api.endpoints.getCount.select()(store.getState()).isUninitialized,
    ).toBe(true)
    expect(store.getState().actions).toHaveLength(actionsBefore)
  })
})
