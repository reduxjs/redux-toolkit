import { createApi, skipToken } from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { setupApiStore } from '../../tests/utils/helpers'
import type { QueryCacheKey } from '../core/apiState'

describe('query selectors', () => {
  const serializeSpy = vi.fn(({ queryArgs }: { queryArgs: string }) =>
    JSON.stringify(queryArgs),
  )

  const api = createApi({
    baseQuery: async (arg: { delayMs: number; value: string }) => {
      await delay(arg.delayMs)
      return { data: arg.value }
    },
    endpoints: (build) => ({
      getThing: build.query<string, { delayMs: number; value: string }>({
        query: (arg) => arg,
      }),
      custom: build.query<string, string>({
        query: (arg) => ({ delayMs: 1, value: arg }),
        serializeQueryArgs: serializeSpy,
      }),
    }),
  })

  const storeRef = setupApiStore(api)

  beforeEach(() => {
    serializeSpy.mockClear()
  })

  test('core selectors expose only the four status flags, and isLoading is true during a refetch', async () => {
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

    // The core selectors have no isFetching, so a refetch of cached data reports isLoading
    const refetching = promise.refetch()
    const duringRefetch = select(store.getState())
    expect(duringRefetch.isLoading).toBe(true)
    expect(duringRefetch.data).toBe('flags')
    expect('isFetching' in duringRefetch).toBe(false)
    await refetching

    promise.unsubscribe()
  })

  test('skipToken does not call serializeQueryArgs, and unknown or removed entries select the same default state', async () => {
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
    expect('data' in skippedResult).toBe(false)
    expect(skipped(store.getState())).toBe(skippedResult)

    const promise = store.dispatch(
      api.endpoints.custom.initiate('removed', { subscribe: false }),
    )
    await promise
    const removedSelect = api.endpoints.custom.select('removed')
    expect(removedSelect(store.getState()).status).toBe('fulfilled')
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: promise.queryCacheKey as QueryCacheKey,
      }),
    )
    expect(removedSelect(store.getState())).toEqual(neverExisted)
  })
})

describe('mutation selectors', () => {
  const api = createApi({
    baseQuery: async () => ({ data: null }),
    endpoints: (build) => ({
      update: build.mutation<null, void>({ query: () => '' }),
    }),
  })

  test('select with neither requestId nor fixedCacheKey returns the uninitialized state', () => {
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const state = store.getState()

    const skipped = api.endpoints.update.select({
      requestId: undefined,
      fixedCacheKey: undefined,
    })(state)

    expect(skipped).toMatchObject({
      status: 'uninitialized',
      isUninitialized: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })
    expect('data' in skipped).toBe(false)
    expect(api.endpoints.update.select('never-dispatched')(state)).toEqual(
      skipped,
    )
  })
})

describe('selectEntriesForEndpoint and selectAllQueryEntries', () => {
  const api = createApi({
    baseQuery: async (arg: string) => {
      if (arg === 'fail') return { error: 'failed' }
      return { data: arg }
    },
    endpoints: (build) => ({
      getPost: build.query<string, string>({
        query: (arg) => arg,
      }),
      getUser: build.query<string, string>({
        query: (arg) => arg,
      }),
      getPages: build.infiniteQuery<string, string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage, allPages, lastPageParam) =>
            lastPageParam + 1,
        },
        query: ({ queryArg, pageParam }) => `${queryArg}-${pageParam}`,
      }),
      updatePost: build.mutation<string, string>({
        query: (arg) => arg,
      }),
    }),
  })

  const storeRef = setupApiStore(api)

  test('returns empty arrays when there are no cache entries', () => {
    const state = storeRef.store.getState()
    expect(api.util.selectAllQueryEntries(state)).toEqual([])
    expect(api.util.selectEntriesForEndpoint(state, 'getPost')).toEqual([])
  })

  test('returns cache entries with their queryCacheKey', async () => {
    const { store } = storeRef
    const post1 = store.dispatch(api.endpoints.getPost.initiate('1'))
    const post2 = store.dispatch(api.endpoints.getPost.initiate('fail'))
    const user = store.dispatch(api.endpoints.getUser.initiate('a'))
    const pages = store.dispatch(api.endpoints.getPages.initiate('p'))
    const mutation = store.dispatch(api.endpoints.updatePost.initiate('x'))
    await Promise.all([post1, post2, user, pages, mutation])

    const state = store.getState()
    const postEntries = api.util.selectEntriesForEndpoint(state, 'getPost')

    expect(postEntries).toEqual([
      expect.objectContaining({
        queryCacheKey: post1.queryCacheKey,
        endpointName: 'getPost',
        originalArgs: '1',
        status: 'fulfilled',
        data: '1',
      }),
      expect.objectContaining({
        queryCacheKey: post2.queryCacheKey,
        endpointName: 'getPost',
        originalArgs: 'fail',
        status: 'rejected',
        error: 'failed',
      }),
    ])

    expect(api.util.selectEntriesForEndpoint(state, 'getPages')).toEqual([
      expect.objectContaining({
        queryCacheKey: pages.queryCacheKey,
        endpointName: 'getPages',
        data: { pages: ['p-0'], pageParams: [0] },
      }),
    ])

    const allEntries = api.util.selectAllQueryEntries(state)
    expect(allEntries.map((entry) => entry.queryCacheKey).sort()).toEqual(
      [
        post1.queryCacheKey,
        post2.queryCacheKey,
        user.queryCacheKey,
        pages.queryCacheKey,
      ].sort(),
    )

    for (const promise of [post1, post2, user, pages]) promise.unsubscribe()
    mutation.reset()

    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: post2.queryCacheKey as QueryCacheKey,
      }),
    )
    expect(
      api.util
        .selectEntriesForEndpoint(store.getState(), 'getPost')
        .map((entry) => entry.queryCacheKey),
    ).toEqual([post1.queryCacheKey])
  })

  test('includes pending entries', async () => {
    const { store } = storeRef
    const post = store.dispatch(api.endpoints.getPost.initiate('pending'))

    expect(
      api.util.selectEntriesForEndpoint(store.getState(), 'getPost'),
    ).toEqual([
      expect.objectContaining({
        queryCacheKey: post.queryCacheKey,
        originalArgs: 'pending',
        status: 'pending',
      }),
    ])

    await post
    post.unsubscribe()
  })

  test('results are memoized until the queries state changes', async () => {
    const { store } = storeRef
    const post = store.dispatch(api.endpoints.getPost.initiate('1'))
    await post

    const state = store.getState()
    const allEntries = api.util.selectAllQueryEntries(state)
    const postEntries = api.util.selectEntriesForEndpoint(state, 'getPost')
    const userEntries = api.util.selectEntriesForEndpoint(state, 'getUser')

    expect(api.util.selectAllQueryEntries(store.getState())).toBe(allEntries)
    expect(api.util.selectEntriesForEndpoint(state, 'getPost')).toBe(
      postEntries,
    )
    expect(api.util.selectEntriesForEndpoint(state, 'getUser')).toBe(
      userEntries,
    )

    await store.dispatch(api.endpoints.getUser.initiate('a'))

    const nextState = store.getState()
    expect(api.util.selectAllQueryEntries(nextState)).not.toBe(allEntries)
    expect(
      api.util.selectEntriesForEndpoint(nextState, 'getUser'),
    ).toHaveLength(1)
    expect(api.util.selectEntriesForEndpoint(nextState, 'getPost')).toBe(
      postEntries,
    )
    expect(api.util.selectAllQueryEntries(nextState)).toContain(postEntries[0])

    post.unsubscribe()
  })
})
