import type { TagDescription } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { waitFor } from '@testing-library/react'
import { delay } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'

const tagTypes = [
  'apple',
  'pear',
  'banana',
  'tomato',
  'cat',
  'dog',
  'giraffe',
] as const
type TagTypes = (typeof tagTypes)[number]
type ProvidedTags = TagDescription<TagTypes>[]
type InvalidatesTags = (ProvidedTags[number] | null | undefined)[]
/** providesTags, invalidatesTags, shouldInvalidate */
const caseMatrix: [ProvidedTags, InvalidatesTags, boolean][] = [
  // *****************************
  // basic invalidation behavior
  // *****************************

  // string
  [['apple'], ['apple'], true],
  [['apple'], ['pear'], false],
  // string and type only behave identical
  [[{ type: 'apple' }], ['apple'], true],
  [[{ type: 'apple' }], ['pear'], false],
  [['apple'], [{ type: 'apple' }], true],
  [['apple'], [{ type: 'pear' }], false],
  // type only invalidates type + id
  [[{ type: 'apple', id: 1 }], [{ type: 'apple' }], true],
  [[{ type: 'pear', id: 1 }], ['apple'], false],
  // type + id never invalidates type only
  [['apple'], [{ type: 'apple', id: 1 }], false],
  [['pear'], [{ type: 'apple', id: 1 }], false],
  // type + id invalidates type + id
  [[{ type: 'apple', id: 1 }], [{ type: 'apple', id: 1 }], true],
  [[{ type: 'apple', id: 1 }], [{ type: 'apple', id: 2 }], false],
  // falsy ids behave as normal ids
  [[{ type: 'apple', id: 0 }], [{ type: 'apple', id: 0 }], true],
  [[{ type: 'apple', id: '' }], [{ type: 'apple', id: '' }], true],
  [[{ type: 'apple', id: 0 }], [{ type: 'apple' }], true],
  [['apple'], [{ type: 'apple', id: 0 }], false],
  // null and undefined
  [['apple'], [null], false],
  [['apple'], [undefined], false],
  [['apple'], [null, 'apple'], true],
  [['apple'], [undefined, 'apple'], true],
  // *****************************
  // test multiple values in array
  // *****************************

  [['apple', 'banana', 'tomato'], ['apple'], true],
  [['apple'], ['pear', 'banana', 'tomato'], false],
  [
    [
      { type: 'apple', id: 1 },
      { type: 'apple', id: 3 },
      { type: 'apple', id: 4 },
    ],
    [{ type: 'apple', id: 1 }],
    true,
  ],
  [
    [{ type: 'apple', id: 1 }],
    [
      { type: 'apple', id: 2 },
      { type: 'apple', id: 3 },
      { type: 'apple', id: 4 },
    ],
    false,
  ],
]

test.each(caseMatrix)(
  '\tprovidesTags: %O,\n\tinvalidatesTags: %O,\n\tshould invalidate: %s',
  async (providesTags, invalidatesTags, shouldInvalidate) => {
    let queryCount = 0
    const {
      store,
      api,
      api: {
        endpoints: { invalidating, providing, unrelated },
      },
    } = setupApiStore(
      createApi({
        baseQuery: fakeBaseQuery(),
        tagTypes,
        endpoints: (build) => ({
          providing: build.query<unknown, void>({
            queryFn() {
              queryCount++
              return { data: {} }
            },
            providesTags,
          }),
          unrelated: build.query<unknown, void>({
            queryFn() {
              return { data: {} }
            },
            providesTags: ['cat', 'dog', { type: 'giraffe', id: 8 }],
          }),
          invalidating: build.mutation<unknown, void>({
            queryFn() {
              return { data: {} }
            },
            invalidatesTags,
          }),
        }),
      }),
      undefined,
      { withoutTestLifecycles: true },
    )

    store.dispatch(providing.initiate())
    store.dispatch(unrelated.initiate())
    expect(queryCount).toBe(1)
    await waitFor(() => {
      expect(api.endpoints.providing.select()(store.getState()).status).toBe(
        'fulfilled',
      )
      expect(api.endpoints.unrelated.select()(store.getState()).status).toBe(
        'fulfilled',
      )
    })
    const toInvalidate = api.util.selectInvalidatedBy(
      store.getState(),
      invalidatesTags,
    )

    if (shouldInvalidate) {
      expect(toInvalidate).toEqual([
        {
          queryCacheKey: 'providing(undefined)',
          endpointName: 'providing',
          originalArgs: undefined,
        },
      ])
    } else {
      expect(toInvalidate).toEqual([])
    }

    store.dispatch(invalidating.initiate())
    expect(queryCount).toBe(1)
    await delay(2)
    expect(queryCount).toBe(shouldInvalidate ? 2 : 1)
  },
)

test('resetApiState drops invalidations held back by delayed invalidation', async () => {
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    invalidationBehavior: 'delayed',
    tagTypes: ['apple'],
    endpoints: (build) => ({
      slow: build.query<string, void>({
        queryFn: async () => {
          await delay(1000)
          return { data: 'slow' }
        },
      }),
      fruit: build.query<string, number>({
        queryFn: () => ({ data: 'fruit' }),
        providesTags: ['apple'],
      }),
    }),
  })
  const storeRef = setupApiStore(api, undefined, {
    withoutTestLifecycles: true,
  })

  const slowPromise = storeRef.store.dispatch(api.endpoints.slow.initiate())
  storeRef.store.dispatch(api.util.invalidateTags(['apple']))
  storeRef.store.dispatch(api.util.resetApiState())

  storeRef.store.dispatch(
    api.util.upsertQueryEntries([
      { endpointName: 'fruit', arg: 1, value: 'fruit' },
    ]),
  )
  expect(storeRef.store.getState().api.queries['fruit(1)']?.data).toBe('fruit')

  await slowPromise
  expect(storeRef.store.getState().api.queries['fruit(1)']?.data).toBe('fruit')
})

function createGate() {
  const waiting: (() => void)[] = []
  return {
    wait: () => new Promise<void>((resolve) => waiting.push(resolve)),
    releaseOldest: () => waiting.shift()?.(),
  }
}

describe('which results invalidate tags', () => {
  test('a thrown error invalidates nothing, but a returned error does', async () => {
    let queryCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery<{ status: number }>(),
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
          queryFn: () => ({ error: { status: 500 } }),
          invalidatesTags: ['Post'],
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(1)
    expect(queryCount).toBe(1)

    const thrown = await store.dispatch(api.endpoints.throwing.initiate())
    await delay(5)
    expect(thrown.error).toBeDefined()
    expect(queryCount).toBe(1)

    await store.dispatch(api.endpoints.returningError.initiate())
    await delay(5)
    expect(queryCount).toBe(2)
  })

  test('tag callbacks that return null or undefined provide and invalidate nothing', async () => {
    let queryCount = 0
    let taggedCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPosts: build.query<number, void>({
          queryFn: () => ({ data: ++queryCount }),
          providesTags: () => null as never,
        }),
        getTagged: build.query<number, void>({
          queryFn: () => ({ data: ++taggedCount }),
          providesTags: ['Post'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: () => undefined as never,
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    store.dispatch(api.endpoints.getPosts.initiate())
    await delay(1)
    expect(store.getState().api.provided.tags).toEqual({})

    await store.dispatch(api.endpoints.getTagged.initiate())
    expect(taggedCount).toBe(1)
    expect(api.util.selectInvalidatedBy(store.getState(), ['Post'])).toEqual([
      {
        endpointName: 'getTagged',
        originalArgs: undefined,
        queryCacheKey: 'getTagged(undefined)',
      },
    ])

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)
    expect(queryCount).toBe(1)
    expect(taggedCount).toBe(1)
  })

  test('invalidatesTags on a query endpoint is ignored', async () => {
    let providerCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: () => ({ data: ++providerCount }),
          providesTags: ['Post'],
        }),
        // Not part of the query definition type; only mutations read it.
        invalidatingQuery: build.query<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        } as never),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    store.dispatch(api.endpoints.provider.initiate())
    await delay(1)
    await store.dispatch(api.endpoints.invalidatingQuery.initiate())
    await delay(5)

    expect(providerCount).toBe(1)
  })
})

describe('delayed invalidation', () => {
  // `provider` and `unrelated` only settle when their gate is released.
  function setupDelayedApi(
    invalidationBehavior: 'delayed' | 'immediately' = 'delayed',
  ) {
    const providerGate = createGate()
    const unrelatedGate = createGate()
    const counts = { provider: 0, secondProvider: 0 }
    const api = createApi({
      invalidationBehavior,
      baseQuery: fakeBaseQuery(),
      tagTypes: ['Post', 'Other'],
      endpoints: (build) => ({
        provider: build.query<number, void>({
          queryFn: async () => {
            const result = ++counts.provider
            await providerGate.wait()
            return { data: result }
          },
          providesTags: ['Post'],
        }),
        secondProvider: build.query<number, void>({
          queryFn: () => ({ data: ++counts.secondProvider }),
          providesTags: ['Post'],
        }),
        unrelated: build.query<null, void>({
          queryFn: async () => {
            await unrelatedGate.wait()
            return { data: null }
          },
          providesTags: ['Other'],
        }),
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          invalidatesTags: ['Post'],
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const startProviderAndUnrelated = async () => {
      store.dispatch(api.endpoints.provider.initiate())
      providerGate.releaseOldest()
      await delay(1)
      store.dispatch(api.endpoints.unrelated.initiate())
      await delay(1)
    }

    return {
      api,
      store,
      counts,
      providerGate,
      unrelatedGate,
      startProviderAndUnrelated,
    }
  }

  test('held invalidations run when any other request settles', async () => {
    const { api, store, counts, unrelatedGate, startProviderAndUnrelated } =
      setupDelayedApi()
    await startProviderAndUnrelated()

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)
    expect(counts.provider).toBe(1)

    unrelatedGate.releaseOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  test('refetches started by an invalidation do not refetch the same entries again', async () => {
    const { api, store, counts, providerGate } = setupDelayedApi()
    store.dispatch(api.endpoints.provider.initiate())
    store.dispatch(api.endpoints.secondProvider.initiate())
    providerGate.releaseOldest()
    await delay(1)

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)
    providerGate.releaseOldest()
    await delay(10)

    expect(counts).toEqual({ provider: 2, secondProvider: 2 })
  })

  test('api.util.invalidateTags is held back like a mutation', async () => {
    const { api, store, counts, unrelatedGate, startProviderAndUnrelated } =
      setupDelayedApi()
    await startProviderAndUnrelated()

    store.dispatch(api.util.invalidateTags(['Post']))
    await delay(5)
    expect(counts.provider).toBe(1)

    unrelatedGate.releaseOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  test('with invalidationBehavior "immediately", api.util.invalidateTags is not held back', async () => {
    const { api, store, counts, startProviderAndUnrelated } =
      setupDelayedApi('immediately')
    await startProviderAndUnrelated()

    store.dispatch(api.util.invalidateTags(['Post']))
    await delay(5)
    expect(counts.provider).toBe(2)
  })

  test('actions from outside the api do not release held invalidations', async () => {
    const { api, store, counts, unrelatedGate, startProviderAndUnrelated } =
      setupDelayedApi()
    await startProviderAndUnrelated()

    await store.dispatch(api.endpoints.update.initiate())
    for (let i = 0; i < 5; i++) {
      store.dispatch({ type: 'otherSlice/somethingHappened' })
    }
    await delay(5)
    expect(counts.provider).toBe(1)

    unrelatedGate.releaseOldest()
    await delay(5)
    expect(counts.provider).toBe(2)
  })
})

describe('invalidated entries', () => {
  test('an invalidated entry with no subscribers is removed instead of refetched', async () => {
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
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    await store.dispatch(
      api.endpoints.provider.initiate(undefined, { subscribe: false }),
    )
    expect(store.getState().api.queries['provider(undefined)']?.data).toBe(1)

    await store.dispatch(api.endpoints.update.initiate())
    await delay(5)

    expect(store.getState().api.queries['provider(undefined)']).toBeUndefined()
    expect(store.getState().api.provided.keys).toEqual({})
    expect(providerCount).toBe(1)
  })

  test('refetches from invalidation are dispatched before queryFulfilled resolves', async () => {
    let refetchesSeen = -1
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
          async onQueryStarted(_, { queryFulfilled, getState }) {
            await queryFulfilled
            const state = getState() as unknown as {
              actions: { type: string }[]
            }
            refetchesSeen = state.actions.filter(
              (action) => action.type === 'api/executeQuery/pending',
            ).length
          },
        }),
      }),
    })
    const storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      { withoutTestLifecycles: true },
    )

    const subscription = storeRef.store.dispatch(
      api.endpoints.provider.initiate(),
    )
    await subscription
    await storeRef.store.dispatch(api.endpoints.update.initiate())

    // One pending for the initial fetch, one for the refetch.
    expect(refetchesSeen).toBe(2)
    subscription.unsubscribe()
  })
})
