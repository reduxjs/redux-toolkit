import type { QueryCacheKey } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { setupApiStore } from '../../tests/utils/helpers'
import * as v from 'valibot'

type Post = { id: number; title: string }
type Request = {
  resolve: (result: { data: Post } | { error: string }) => void
}

let requests: Request[] = []
let outcomes = new Map<string, unknown>()
const providesTags = vi.fn((result: Post | undefined) =>
  result ? [{ type: 'Post' as const, id: result.title }] : [],
)

const api = createApi({
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      queryFn: () =>
        new Promise((resolve) => {
          requests.push({ resolve })
        }),
      providesTags,
      onQueryStarted: (_, { requestId, queryFulfilled }) => {
        queryFulfilled.then(
          ({ data }) => outcomes.set(requestId, data),
          ({ error }) => outcomes.set(requestId, error),
        )
      },
    }),
    validatedPost: build.query<Post, number>({
      queryFn: () =>
        new Promise((resolve) => {
          requests.push({ resolve })
        }),
      responseSchema: v.object({ id: v.number(), title: v.string() }),
      catchSchemaFailure: () => 'invalid',
    }),
    infinitePosts: build.infiniteQuery<Post, number, number>({
      queryFn: () =>
        new Promise((resolve) => {
          requests.push({ resolve })
        }),
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (_, __, lastPageParam) => lastPageParam + 1,
      },
    }),
  }),
})

const storeRef = setupApiStore(api)
const otherStoreRef = setupApiStore(api)
const initial: Post = { id: 1, title: 'initial' }
const manual: Post = { id: 1, title: 'manual' }
const fetched: Post = { id: 1, title: 'fetched' }
const select = (id = 1) =>
  api.endpoints.getPost.select(id)(storeRef.store.getState())
const tags = () =>
  storeRef.store.getState().api.provided.keys['getPost(1)' as QueryCacheKey]

const seed = () =>
  storeRef.store.dispatch(api.util.upsertQueryData('getPost', 1, initial))

function fetchPost(id = 1) {
  const promise = storeRef.store.dispatch(
    api.endpoints.getPost.initiate(id, {
      subscribe: false,
      forceRefetch: true,
    }),
  )
  return { promise, ...requests[requests.length - 1] }
}

type Write = 'update' | 'upsert'
async function write(
  method: Write,
  options?: { ignoreEarlierFetches?: boolean },
  title = manual.title,
) {
  const { store } = storeRef
  if (method === 'update') {
    store.dispatch(
      api.util.updateQueryData(
        'getPost',
        1,
        (draft) => {
          draft.title = title
        },
        options,
      ),
    )
  } else {
    await store.dispatch(
      api.util.upsertQueryData('getPost', 1, { id: 1, title }, options),
    )
  }
}

beforeEach(() => {
  requests = []
  outcomes = new Map()
})

describe.each<Write>(['update', 'upsert'])('%sQueryData ordering', (method) => {
  test.each([undefined, {}, { ignoreEarlierFetches: false }])(
    'preserves last-result-wins with options %j',
    async (options) => {
      await seed()
      const old = fetchPost()
      await write(method, options)
      expect(select().data).toEqual(manual)

      old.resolve({ data: fetched })
      await old.promise
      expect(select().data).toEqual(fetched)
      expect(tags()).toEqual([{ type: 'Post', id: 'fetched' }])
    },
  )

  test('protects a write from an earlier fetch, including its provided tags', async () => {
    await seed()
    const old = fetchPost()
    await write(method, { ignoreEarlierFetches: true })

    old.resolve({ data: fetched })
    const result = await old.promise
    expect(select()).toMatchObject({ status: 'fulfilled', data: manual })
    expect(tags()).toEqual([{ type: 'Post', id: 'manual' }])
    expect(result.data).toEqual(manual)
    expect(outcomes.get(old.promise.requestId)).toEqual(fetched)
  })

  test('allows a later fetch and its tags after ignoring an earlier result', async () => {
    await seed()
    const old = fetchPost()
    await write(method, { ignoreEarlierFetches: true })
    old.resolve({ data: fetched })
    await old.promise
    expect(select().data).toEqual(manual)

    const next = fetchPost()
    const latest = { id: 1, title: 'latest' }
    next.resolve({ data: latest })
    await next.promise
    expect(select().data).toEqual(latest)
    expect(tags()).toEqual([{ type: 'Post', id: 'latest' }])
  })

  test('settles an earlier error while retaining the manual data and tags', async () => {
    await seed()
    const old = fetchPost()
    await write(method, { ignoreEarlierFetches: true })

    old.resolve({ error: 'failed' })
    await old.promise
    expect(select()).toMatchObject({
      status: 'rejected',
      error: 'failed',
      data: manual,
    })
    expect(tags()).toEqual([{ type: 'Post', id: 'manual' }])
    expect(outcomes.get(old.promise.requestId)).toBe('failed')
  })

  test('orders requests within the same millisecond', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(123456)
    try {
      await seed()
      const old = fetchPost()
      await write(method, { ignoreEarlierFetches: true })
      old.resolve({ data: fetched })
      await old.promise
      expect(select().data).toEqual(manual)

      const next = fetchPost()
      next.resolve({ data: fetched })
      await next.promise
      expect(select().data).toEqual(fetched)
    } finally {
      clock.mockRestore()
    }
  })

  test('does not protect another cache key', async () => {
    await seed()
    const other = fetchPost(2)
    await write(method, { ignoreEarlierFetches: true })
    const otherPost = { id: 2, title: 'other' }
    other.resolve({ data: otherPost })
    await other.promise
    expect(select(2).data).toEqual(otherPost)
  })

  test('does not prevent refetching after reset', async () => {
    await seed()
    const old = fetchPost()
    await write(method, { ignoreEarlierFetches: true })
    storeRef.store.dispatch(api.util.resetApiState())
    await old.promise

    const next = fetchPost()
    next.resolve({ data: fetched })
    await next.promise
    expect(select().data).toEqual(fetched)
  })

  test('isolates ordering between stores sharing the same API', async () => {
    await seed()
    const other = otherStoreRef.store.dispatch(
      api.endpoints.getPost.initiate(1),
    )
    const request = requests[requests.length - 1]
    await write(method, { ignoreEarlierFetches: true })

    request.resolve({ data: fetched })
    await other
    expect(
      api.endpoints.getPost.select(1)(otherStoreRef.store.getState()).data,
    ).toEqual(fetched)
    expect(select().data).toEqual(manual)
  })

  test('ignores an earlier asynchronous upsert as well as an earlier fetch', async () => {
    await seed()
    const old = fetchPost()
    const upsert = storeRef.store.dispatch(
      api.util.upsertQueryData('getPost', 1, fetched),
    )
    await write(method, { ignoreEarlierFetches: true })
    await upsert
    old.resolve({ data: fetched })
    await old.promise
    expect(select().data).toEqual(manual)
    expect(tags()).toEqual([{ type: 'Post', id: 'manual' }])
  })
})

describe('updateQueryData options', () => {
  test.each([false, { updateProvided: false, ignoreEarlierFetches: true }])(
    'respects updateProvided with %j, including undo',
    async (options) => {
      await seed()
      providesTags.mockClear()
      const patch = storeRef.store.dispatch(
        api.util.updateQueryData(
          'getPost',
          1,
          (draft) => {
            draft.title = manual.title
          },
          options,
        ),
      )
      expect(select().data).toEqual(manual)
      expect(tags()).toEqual([{ type: 'Post', id: 'initial' }])
      expect(providesTags).not.toHaveBeenCalled()
      patch.undo({ ifUnchanged: true })
      expect(select().data).toEqual(initial)
      expect(tags()).toEqual([{ type: 'Post', id: 'initial' }])
      expect(providesTags).not.toHaveBeenCalled()
    },
  )

  test('keeps updateProvided true by default with ordering enabled', async () => {
    await seed()
    const patch = storeRef.store.dispatch(
      api.util.updateQueryData(
        'getPost',
        1,
        (draft) => {
          draft.title = manual.title
        },
        { ignoreEarlierFetches: true },
      ),
    )
    expect(tags()).toEqual([{ type: 'Post', id: 'manual' }])
    patch.undo()
    expect(select().data).toEqual(initial)
    expect(tags()).toEqual([{ type: 'Post', id: 'initial' }])
  })

  test('undo does not allow an earlier fetch to overwrite the reverted data', async () => {
    await seed()
    const old = fetchPost()
    const patch = storeRef.store.dispatch(
      api.util.updateQueryData(
        'getPost',
        1,
        (draft) => {
          draft.title = manual.title
        },
        { ignoreEarlierFetches: true },
      ),
    )
    patch.undo({ ifUnchanged: true })
    old.resolve({ data: fetched })
    await old.promise
    expect(select().data).toEqual(initial)
    expect(tags()).toEqual([{ type: 'Post', id: 'initial' }])
  })

  test.each(['missing data', 'unchanged recipe', 'throwing recipe'])(
    'does not ignore a fetch after an update with %s',
    async (reason) => {
      if (reason !== 'missing data') await seed()
      const old = fetchPost()
      const recipe = vi.fn(() => {
        if (reason === 'throwing recipe') throw new Error('recipe failed')
      })
      const update = () =>
        storeRef.store.dispatch(
          api.util.updateQueryData('getPost', 1, recipe, {
            ignoreEarlierFetches: true,
          }),
        )
      if (reason === 'throwing recipe') {
        expect(update).toThrow('recipe failed')
      } else {
        expect(update().patches).toEqual([])
      }
      if (reason === 'missing data') expect(recipe).not.toHaveBeenCalled()
      old.resolve({ data: fetched })
      await old.promise
      expect(select().data).toEqual(fetched)
    },
  )
})

test.each<Write>(['update', 'upsert'])(
  '%sQueryData protects infinite query pages and permits later fetches',
  async (method) => {
    const { store } = storeRef
    const endpoint = api.endpoints.infinitePosts
    await store.dispatch(
      api.util.upsertQueryData('infinitePosts', 1, {
        pages: [initial],
        pageParams: [0],
      }),
    )
    const old = store.dispatch(endpoint.initiate(1, { forceRefetch: true }))
    const request = requests[requests.length - 1]
    if (method === 'update') {
      store.dispatch(
        api.util.updateQueryData(
          'infinitePosts',
          1,
          (draft) => {
            draft.pages[0] = manual
          },
          { ignoreEarlierFetches: true },
        ),
      )
    } else {
      await store.dispatch(
        api.util.upsertQueryData(
          'infinitePosts',
          1,
          { pages: [manual], pageParams: [0] },
          { ignoreEarlierFetches: true },
        ),
      )
    }
    request.resolve({ data: fetched })
    await old
    expect(endpoint.select(1)(store.getState()).data).toEqual({
      pages: [manual],
      pageParams: [0],
    })

    const next = store.dispatch(endpoint.initiate(1, { direction: 'forward' }))
    requests[requests.length - 1].resolve({ data: fetched })
    await next
    expect(endpoint.select(1)(store.getState()).data).toEqual({
      pages: [manual, fetched],
      pageParams: [0, 1],
    })
  },
)

describe('asynchronous upsert ordering', () => {
  test('allows a fetch started after the upsert but before it finishes', async () => {
    await seed()
    const upsert = storeRef.store.dispatch(
      api.util.upsertQueryData('getPost', 1, manual, {
        ignoreEarlierFetches: true,
      }),
    )
    const later = fetchPost()
    await upsert
    expect(select().data).toEqual(manual)

    later.resolve({ data: fetched })
    await later.promise
    expect(select().data).toEqual(fetched)
    expect(tags()).toEqual([{ type: 'Post', id: 'fetched' }])
  })

  test('does not weaken protection from a newer manual write', async () => {
    await seed()
    const upsert = storeRef.store.dispatch(
      api.util.upsertQueryData('getPost', 1, fetched, {
        ignoreEarlierFetches: true,
      }),
    )
    storeRef.store.dispatch(
      api.util.updateQueryData(
        'getPost',
        1,
        (draft) => {
          draft.title = manual.title
        },
        { ignoreEarlierFetches: true },
      ),
    )
    await upsert
    expect(select().data).toEqual(manual)
    expect(tags()).toEqual([{ type: 'Post', id: 'manual' }])
  })

  test('a failed schema validation does not suppress a valid in-flight fetch', async () => {
    const { store } = storeRef
    await store.dispatch(api.util.upsertQueryData('validatedPost', 1, initial))
    const old = store.dispatch(
      api.endpoints.validatedPost.initiate(1, { forceRefetch: true }),
    )
    const request = requests[requests.length - 1]
    await store.dispatch(
      api.util.upsertQueryData(
        'validatedPost',
        1,
        // @ts-expect-error exercise runtime validation of invalid input
        { id: 'invalid', title: 'invalid' },
        { ignoreEarlierFetches: true },
      ),
    )
    request.resolve({ data: fetched })
    await old
    expect(
      api.endpoints.validatedPost.select(1)(store.getState()).data,
    ).toEqual(fetched)
  })
})
