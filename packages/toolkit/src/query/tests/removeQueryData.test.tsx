import { configureStore, isAction } from '@reduxjs/toolkit'
import type { UnknownAction } from '@reduxjs/toolkit'
import { createApi, QueryStatus } from '@reduxjs/toolkit/query/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { withProvider } from '../../tests/utils/helpers'

const setup = ({ keepUnusedDataFor = 60 } = {}) => {
  const calls: string[] = []
  const aborted: string[] = []
  const responded: string[] = []
  const removalReasons: (string | undefined)[] = []
  const pendingResponses: (() => void)[] = []
  let holdResponses = false

  const api = createApi({
    baseQuery: async () => ({ data: undefined }),
    keepUnusedDataFor,
    endpoints: (build) => ({
      getThing: build.query<string, string>({
        queryFn: async (arg, { signal }) => {
          calls.push(arg)
          signal.addEventListener('abort', () => aborted.push(arg))
          if (holdResponses) {
            await new Promise<void>((resolve) => pendingResponses.push(resolve))
          }
          responded.push(arg)
          return { data: `thing ${arg}` }
        },
        async onCacheEntryAdded(
          _arg,
          { cacheEntryRemoved, getCacheEntryRemovedReason },
        ) {
          await cacheEntryRemoved
          removalReasons.push(getCacheEntryRemovedReason())
        },
      }),
      getById: build.query<string, { id: number; label: string }>({
        queryFn: ({ id, label }) => ({ data: `${id} ${label}` }),
        serializeQueryArgs: ({ queryArgs }) => queryArgs.id,
      }),
      getPages: build.infiniteQuery<string, string, number>({
        queryFn: ({ queryArg, pageParam }) => ({
          data: `${queryArg} page ${pageParam}`,
        }),
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
            lastPageParam + 1,
        },
      }),
    }),
  })

  const actions: UnknownAction[] = []
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) =>
      gdm()
        .concat(api.middleware)
        .concat(() => (next) => (action) => {
          if (isAction(action)) actions.push(action)
          return next(action)
        }),
  })

  return {
    api,
    store,
    calls,
    aborted,
    responded,
    actions,
    removalReasons,
    holdResponses: () => {
      holdResponses = true
    },
    releaseResponses: () => {
      holdResponses = false
      for (const resolve of pendingResponses.splice(0)) resolve()
    },
  }
}

describe('api.util.removeQueryData', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('removes the entry for the given arg and leaves other entries alone', async () => {
    const { api, store, removalReasons } = setup()
    await store.dispatch(
      api.endpoints.getThing.initiate('a', { subscribe: false }),
    )
    await store.dispatch(
      api.endpoints.getThing.initiate('b', { subscribe: false }),
    )

    expect(store.dispatch(api.util.removeQueryData('getThing', 'a'))).toBe(true)

    expect(api.endpoints.getThing.select('a')(store.getState()).status).toBe(
      QueryStatus.uninitialized,
    )
    expect(api.endpoints.getThing.select('b')(store.getState()).data).toBe(
      'thing b',
    )
    await waitFor(() => expect(removalReasons).toEqual(['removed']))
  })

  test('returns false when there is no entry for the arg', () => {
    const { api, store } = setup()
    expect(store.dispatch(api.util.removeQueryData('getThing', 'a'))).toBe(
      false,
    )
  })

  test('finds the entry through the endpoint serializeQueryArgs', async () => {
    const { api, store } = setup()
    await store.dispatch(
      api.endpoints.getById.initiate(
        { id: 1, label: 'first' },
        { subscribe: false },
      ),
    )

    expect(
      store.dispatch(
        api.util.removeQueryData('getById', { id: 1, label: 'other' }),
      ),
    ).toBe(true)
    expect(
      api.endpoints.getById.select({ id: 1, label: 'first' })(store.getState())
        .status,
    ).toBe(QueryStatus.uninitialized)
  })

  test('removes an infinite query entry', async () => {
    const { api, store } = setup()
    await store.dispatch(
      api.endpoints.getPages.initiate('x', { subscribe: false }),
    )
    expect(api.endpoints.getPages.select('x')(store.getState()).data).toEqual({
      pages: ['x page 0'],
      pageParams: [0],
    })

    expect(store.dispatch(api.util.removeQueryData('getPages', 'x'))).toBe(true)
    expect(api.endpoints.getPages.select('x')(store.getState()).status).toBe(
      QueryStatus.uninitialized,
    )
  })

  test('aborts a running request, and its late response does not restore the entry', async () => {
    const {
      api,
      store,
      aborted,
      responded,
      actions,
      holdResponses,
      releaseResponses,
    } = setup()
    holdResponses()
    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))

    store.dispatch(api.util.removeQueryData('getThing', 'a'))

    expect(aborted).toEqual(['a'])
    await expect(promise).resolves.toMatchObject({
      isError: true,
      error: { name: 'AbortError', message: 'removed' },
    })
    releaseResponses()
    await waitFor(() => expect(responded).toEqual(['a']))
    expect(actions.some(api.endpoints.getThing.matchFulfilled)).toBe(false)
    expect(api.endpoints.getThing.select('a')(store.getState()).status).toBe(
      QueryStatus.uninitialized,
    )
  })

  test('clears the removal timer, so it cannot remove a newer entry for the key', async () => {
    vi.useFakeTimers()
    const { api, store } = setup({ keepUnusedDataFor: 1 })
    const subscription = store.dispatch(api.endpoints.getThing.initiate('a'))
    await subscription
    subscription.unsubscribe()
    await vi.advanceTimersByTimeAsync(500)

    store.dispatch(api.util.removeQueryData('getThing', 'a'))
    await vi.advanceTimersByTimeAsync(100)
    await store.dispatch(api.util.upsertQueryData('getThing', 'a', 'upserted'))

    // The first entry's timer would have fired at 1000ms
    await vi.advanceTimersByTimeAsync(500)
    expect(api.endpoints.getThing.select('a')(store.getState()).data).toBe(
      'upserted',
    )

    await vi.advanceTimersByTimeAsync(600)
    expect(api.endpoints.getThing.select('a')(store.getState()).status).toBe(
      QueryStatus.uninitialized,
    )
  })

  test('onlyIfUnused leaves entries with subscribers alone', async () => {
    const { api, store, calls } = setup()
    const subscription = store.dispatch(api.endpoints.getThing.initiate('a'))
    await subscription

    expect(
      store.dispatch(
        api.util.removeQueryData('getThing', 'a', { onlyIfUnused: true }),
      ),
    ).toBe(false)
    expect(api.endpoints.getThing.select('a')(store.getState()).data).toBe(
      'thing a',
    )

    subscription.unsubscribe()
    expect(
      store.dispatch(
        api.util.removeQueryData('getThing', 'a', { onlyIfUnused: true }),
      ),
    ).toBe(true)
    expect(api.endpoints.getThing.select('a')(store.getState()).status).toBe(
      QueryStatus.uninitialized,
    )
    expect(calls).toEqual(['a'])
  })

  test('a mounted hook goes back to loading and refetches', async () => {
    const { api, store, calls } = setup()
    const renders: { isLoading: boolean; data: string | undefined }[] = []
    const { result } = renderHook(
      () => {
        const query = api.endpoints.getThing.useQuery('a')
        renders.push({ isLoading: query.isLoading, data: query.data })
        return query
      },
      { wrapper: withProvider(store) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const rendersBeforeRemoval = renders.length

    store.dispatch(api.util.removeQueryData('getThing', 'a'))

    await waitFor(() => expect(calls).toEqual(['a', 'a']))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(renders.slice(rendersBeforeRemoval)).toContainEqual({
      isLoading: true,
      data: undefined,
    })
    expect(result.current.data).toBe('thing a')
  })

  test('a mounted lazy query hook does not refetch', async () => {
    const { api, store, calls } = setup()
    const { result } = renderHook(() => api.endpoints.getThing.useLazyQuery(), {
      wrapper: withProvider(store),
    })
    await act(() => result.current[0]('a'))
    expect(result.current[1].data).toBe('thing a')

    act(() => {
      store.dispatch(api.util.removeQueryData('getThing', 'a'))
    })

    await waitFor(() => expect(result.current[1].isUninitialized).toBe(true))
    expect(result.current[1].data).toBeUndefined()
    expect(calls).toEqual(['a'])
  })

  test('arguments are typed per endpoint', () => {
    const { api } = setup()
    // @ts-expect-error
    api.util.removeQueryData('getThing', 1)
    // @ts-expect-error
    api.util.removeQueryData('unknown', 'a')
    // @ts-expect-error
    api.util.removeQueryData('getThing', 'a', { onlyIfUnused: 'yes' })
    api.util.removeQueryData('getPages', 'x', { onlyIfUnused: true })
  })
})
