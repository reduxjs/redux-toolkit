import { onFocus, onOnline } from '@internal/query/core/setupListeners'
import { configureStore } from '@reduxjs/toolkit'
import type { QueryStartReason } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query'
import { waitFor } from '@testing-library/react'

function setup() {
  const baseQueryReasons: (QueryStartReason | undefined)[] = []
  const startedReasons: QueryStartReason[] = []
  const addedReasons: QueryStartReason[] = []
  let shouldFail = false

  const api = createApi({
    baseQuery: (_arg: unknown, { startReason }) => {
      baseQueryReasons.push(startReason)
      if (shouldFail) return { error: 'failed' }
      return { data: baseQueryReasons.length }
    },
    tagTypes: ['Thing'],
    endpoints: (build) => ({
      thing: build.query<number, number>({
        query: () => '',
        providesTags: ['Thing'],
        onQueryStarted(_arg, { startReason }) {
          startedReasons.push(startReason)
        },
        onCacheEntryAdded(_arg, { startReason }) {
          addedReasons.push(startReason)
        },
      }),
      pages: build.infiniteQuery<number, number, number>({
        query: ({ pageParam }) => `${pageParam}`,
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
            lastPageParam + 1,
          getPreviousPageParam: (_firstPage, _allPages, firstPageParam) =>
            firstPageParam - 1,
        },
        onQueryStarted(_arg, { startReason }) {
          startedReasons.push(startReason)
        },
      }),
      update: build.mutation<number, void>({
        query: () => '',
      }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return {
    api,
    store,
    baseQueryReasons,
    startedReasons,
    addedReasons,
    setShouldFail(value: boolean) {
      shouldFail = value
    },
  }
}

describe('startReason', () => {
  test('initial request, then refetch() and forceRefetch', async () => {
    const { api, store, baseQueryReasons, startedReasons, addedReasons } =
      setup()

    const sub = store.dispatch(api.endpoints.thing.initiate(1))
    await sub
    await sub.refetch()
    await store.dispatch(
      api.endpoints.thing.initiate(1, { subscribe: false, forceRefetch: true }),
    )

    expect(baseQueryReasons).toEqual(['initial', 'refetch', 'refetch'])
    expect(startedReasons).toEqual(['initial', 'refetch', 'refetch'])
    expect(addedReasons).toEqual(['initial'])
    sub.unsubscribe()
  })

  test('a retry after an error with no data is initial', async () => {
    const { api, store, baseQueryReasons, setShouldFail } = setup()

    setShouldFail(true)
    const sub = store.dispatch(api.endpoints.thing.initiate(1))
    await sub
    setShouldFail(false)
    await sub.refetch()

    expect(baseQueryReasons).toEqual(['initial', 'initial'])
    sub.unsubscribe()
  })

  test('tag invalidation', async () => {
    const { api, store, baseQueryReasons } = setup()

    const sub = store.dispatch(api.endpoints.thing.initiate(1))
    await sub
    store.dispatch(api.util.invalidateTags(['Thing']))

    await waitFor(() =>
      expect(baseQueryReasons).toEqual(['initial', 'invalidation']),
    )
    sub.unsubscribe()
  })

  test('polling', async () => {
    const { api, store, baseQueryReasons } = setup()

    const sub = store.dispatch(
      api.endpoints.thing.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
      }),
    )
    await sub

    await waitFor(() => expect(baseQueryReasons[1]).toBe('poll'))
    sub.unsubscribe()
  })

  test('refetchOnFocus and refetchOnReconnect', async () => {
    const { api, store, baseQueryReasons } = setup()

    const sub = store.dispatch(
      api.endpoints.thing.initiate(1, {
        subscriptionOptions: { refetchOnFocus: true, refetchOnReconnect: true },
      }),
    )
    await sub

    store.dispatch(onFocus())
    await waitFor(() => expect(baseQueryReasons).toHaveLength(2))
    store.dispatch(onOnline())
    await waitFor(() => expect(baseQueryReasons).toHaveLength(3))

    expect(baseQueryReasons).toEqual(['initial', 'focus', 'reconnect'])
    sub.unsubscribe()
  })

  test('upsertQueryData and upsertQueryEntries', async () => {
    const { api, store, baseQueryReasons, startedReasons, addedReasons } =
      setup()

    await store.dispatch(api.util.upsertQueryData('thing', 1, 5))
    store.dispatch(
      api.util.upsertQueryEntries([
        { endpointName: 'thing', arg: 2, value: 6 },
      ]),
    )

    expect(baseQueryReasons).toEqual([])
    expect(startedReasons).toEqual(['upsert'])
    expect(addedReasons).toEqual(['upsert', 'upsert'])
  })

  test('infinite query pages', async () => {
    const { api, store, baseQueryReasons, startedReasons } = setup()

    const sub = store.dispatch(api.endpoints.pages.initiate(1))
    await sub
    await store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'forward' }),
    )
    await store.dispatch(
      api.endpoints.pages.initiate(1, { direction: 'backward' }),
    )
    await sub.refetch()

    expect(startedReasons).toEqual([
      'initial',
      'nextPage',
      'previousPage',
      'refetch',
    ])
    expect(baseQueryReasons.slice(0, 3)).toEqual([
      'initial',
      'nextPage',
      'previousPage',
    ])
    expect(baseQueryReasons.slice(3)).toEqual(['refetch', 'refetch', 'refetch'])
    sub.unsubscribe()
  })

  test('mutations have no startReason', async () => {
    const { api, store, baseQueryReasons } = setup()

    await store.dispatch(api.endpoints.update.initiate())

    expect(baseQueryReasons).toEqual([undefined])
  })
})
