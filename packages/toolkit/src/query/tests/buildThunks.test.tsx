import type { Middleware } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import type { BaseQueryApi } from '@reduxjs/toolkit/query/react'
import { createApi } from '@reduxjs/toolkit/query/react'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockInstance } from 'vitest'
import {
  actionsReducer,
  setupApiStore,
  withProvider,
} from '../../tests/utils/helpers'

describe('baseline thunk behavior', () => {
  test('handles a non-async baseQuery without error', async () => {
    const baseQuery = (args?: any) => ({ data: args })
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        getUser: build.query<unknown, number>({
          query(id) {
            return { url: `user/${id}` }
          },
        }),
      }),
    })
    const { getUser } = api.endpoints
    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    const promise = store.dispatch(getUser.initiate(1))
    const { data } = await promise

    expect(data).toEqual({
      url: 'user/1',
    })

    const storeResult = getUser.select(1)(store.getState())
    expect(storeResult).toEqual({
      data: {
        url: 'user/1',
      },
      endpointName: 'getUser',
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: 1,
      requestId: expect.any(String),
      status: 'fulfilled',
      startedTimeStamp: expect.any(Number),
      fulfilledTimeStamp: expect.any(Number),
    })
  })

  test('passes the extraArgument property to the baseQueryApi', async () => {
    const baseQuery = (_args: any, api: BaseQueryApi) => ({ data: api.extra })
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        getUser: build.query<unknown, void>({
          query: () => '',
        }),
      }),
    })
    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (gDM) =>
        gDM({ thunk: { extraArgument: 'cakes' } }).concat(api.middleware),
    })
    const { getUser } = api.endpoints
    const { data } = await store.dispatch(getUser.initiate())
    expect(data).toBe('cakes')
  })

  test('only triggers transformResponse when a query method is actually used', async () => {
    const baseQuery = (args?: any) => ({ data: args })
    const transformResponse = vi.fn((response: any) => response)
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        hasQuery: build.query<string, string>({
          query: (arg) => 'test',
          transformResponse,
        }),
        hasQueryFn: build.query<string, void>(
          // @ts-expect-error
          {
            queryFn: () => ({ data: 'test' }),
            transformResponse,
          },
        ),
      }),
    })

    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (gDM) =>
        gDM({ thunk: { extraArgument: 'cakes' } }).concat(api.middleware),
    })

    await store.dispatch(api.util.upsertQueryData('hasQuery', 'a', 'test'))
    expect(transformResponse).not.toHaveBeenCalled()

    transformResponse.mockReset()

    await store.dispatch(api.endpoints.hasQuery.initiate('b'))
    expect(transformResponse).toHaveBeenCalledTimes(1)

    transformResponse.mockReset()

    await store.dispatch(api.endpoints.hasQueryFn.initiate())
    expect(transformResponse).not.toHaveBeenCalled()
  })
})

describe('request start meta', () => {
  const api = createApi({
    baseQuery: (arg: string) =>
      arg === 'fail' ? { error: 'failed' } : { data: arg },
    endpoints: (build) => ({
      getItem: build.query<string, string>({
        query: (arg) => arg,
      }),
      getPages: build.infiniteQuery<string, string, number>({
        query: ({ pageParam }) => String(pageParam),
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
            lastPageParam + 1,
        },
      }),
      updateItem: build.mutation<string, string>({
        query: (arg) => arg,
      }),
      throwing: build.query<string, void>({
        queryFn: () => {
          throw new Error('boom')
        },
      }),
      slow: build.query<string, void>({
        queryFn: () => new Promise(() => {}),
      }),
    }),
  })

  type RecordedAction = {
    type: string
    meta?: {
      requestId?: string
      requestStatus?: string
      startedTimeStamp?: number
      seq?: number
      aborted?: boolean
    }
  }

  function makeStore() {
    const actions: RecordedAction[] = []
    const recorder: Middleware = () => (next) => (action) => {
      actions.push(action as RecordedAction)
      return next(action)
    }
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware, recorder),
    })
    const thunkActions = () =>
      actions.filter((action) => action.meta?.requestStatus !== undefined)
    return { store, thunkActions }
  }

  let consoleErrorSpy: MockInstance<typeof console.error>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  test('pending and settled actions of every thunk share startedTimeStamp and seq', async () => {
    const { store, thunkActions } = makeStore()

    await store.dispatch(api.endpoints.getItem.initiate('a'))
    await store.dispatch(api.endpoints.getItem.initiate('fail'))
    await store.dispatch(api.endpoints.getPages.initiate('x'))
    await store.dispatch(
      api.endpoints.getPages.initiate('x', { direction: 'forward' }),
    )
    await store.dispatch(api.endpoints.updateItem.initiate('m'))
    await store.dispatch(api.endpoints.updateItem.initiate('fail'))
    await store.dispatch(api.util.upsertQueryData('getItem', 'b', 'upserted'))

    const actions = thunkActions()
    expect(actions).toHaveLength(14)

    const byRequest = new Map<string, RecordedAction[]>()
    for (const action of actions) {
      const requestId = action.meta!.requestId!
      byRequest.set(requestId, [...(byRequest.get(requestId) ?? []), action])
    }
    expect(byRequest.size).toBe(7)

    const seqs: number[] = []
    for (const [pending, settled] of byRequest.values()) {
      expect(pending.meta!.requestStatus).toBe('pending')
      expect(settled.meta!.requestStatus).not.toBe('pending')
      expect(pending.meta!.startedTimeStamp).toEqual(expect.any(Number))
      expect(settled.meta!.startedTimeStamp).toBe(
        pending.meta!.startedTimeStamp,
      )
      expect(settled.meta!.seq).toBe(pending.meta!.seq)
      seqs.push(pending.meta!.seq!)
    }
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('seq orders requests that start in the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const { store, thunkActions } = makeStore()

    await Promise.all([
      store.dispatch(api.endpoints.getItem.initiate('a')),
      store.dispatch(api.endpoints.getItem.initiate('b')),
      store.dispatch(api.endpoints.updateItem.initiate('c')),
    ])
    vi.mocked(Date.now).mockRestore()

    const pending = thunkActions().filter(
      (action) => action.meta!.requestStatus === 'pending',
    )
    expect(pending.map((action) => action.meta!.startedTimeStamp)).toEqual([
      1000, 1000, 1000,
    ])
    expect(pending.map((action) => action.meta!.seq)).toEqual([1, 2, 3])
  })

  test('each store has its own counter', async () => {
    const first = makeStore()
    const second = makeStore()

    await first.store.dispatch(api.endpoints.getItem.initiate('a'))
    await first.store.dispatch(api.endpoints.getItem.initiate('b'))
    await second.store.dispatch(api.endpoints.getItem.initiate('a'))

    const seqs = (actions: RecordedAction[]) =>
      actions
        .filter((action) => action.meta!.requestStatus === 'pending')
        .map((action) => action.meta!.seq)
    expect(seqs(first.thunkActions())).toEqual([1, 2])
    expect(seqs(second.thunkActions())).toEqual([1])
  })

  test('aborted and unhandled-error rejections have no request start meta', async () => {
    const { store, thunkActions } = makeStore()

    await store.dispatch(api.endpoints.throwing.initiate())
    const slowPromise = store.dispatch(api.endpoints.slow.initiate())
    slowPromise.abort()
    await slowPromise

    const rejected = thunkActions().filter(
      (action) => action.meta!.requestStatus === 'rejected',
    )
    expect(rejected).toHaveLength(2)
    expect(rejected[1].meta!.aborted).toBe(true)
    for (const action of rejected) {
      expect(action.meta!.startedTimeStamp).toBeUndefined()
      expect(action.meta!.seq).toBeUndefined()
    }
  })
})

describe('re-triggering behavior on arg change', () => {
  const api = createApi({
    baseQuery: () => ({ data: null }),
    endpoints: (build) => ({
      getUser: build.query<any, any>({
        query: (obj) => obj,
      }),
    }),
  })
  const { getUser } = api.endpoints
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  const spy = vi.spyOn(getUser, 'initiate')
  beforeEach(() => void spy.mockClear())

  test('re-trigger on literal value change', async () => {
    const { result, rerender } = renderHook(
      (props) => getUser.useQuery(props),
      {
        wrapper: withProvider(store),
        initialProps: 5,
      },
    )

    await waitFor(() => {
      expect(result.current.status).not.toBe('pending')
    })

    expect(spy).toHaveBeenCalledOnce()

    for (let x = 1; x < 3; x++) {
      rerender(6)
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledTimes(2)
    }

    for (let x = 1; x < 3; x++) {
      rerender(7)
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledTimes(3)
    }
  })

  test('only re-trigger on shallow-equal arg change', async () => {
    const { result, rerender } = renderHook(
      (props) => getUser.useQuery(props),
      {
        wrapper: withProvider(store),
        initialProps: { name: 'Bob', likes: 'iceCream' },
      },
    )

    await waitFor(() => {
      expect(result.current.status).not.toBe('pending')
    })
    expect(spy).toHaveBeenCalledOnce()

    for (let x = 1; x < 3; x++) {
      rerender({ name: 'Bob', likes: 'waffles' })
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledTimes(2)
    }

    for (let x = 1; x < 3; x++) {
      rerender({ name: 'Alice', likes: 'waffles' })
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledTimes(3)
    }
  })

  test('re-triggers every time on deeper value changes', async () => {
    const name = 'Tim'

    const { result, rerender } = renderHook(
      (props) => getUser.useQuery(props),
      {
        wrapper: withProvider(store),
        initialProps: { person: { name } },
      },
    )

    await waitFor(() => {
      expect(result.current.status).not.toBe('pending')
    })
    expect(spy).toHaveBeenCalledOnce()

    for (let x = 1; x < 3; x++) {
      rerender({ person: { name: name + x } })
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledTimes(x + 1)
    }
  })

  test('do not re-trigger if the order of keys change while maintaining the same values', async () => {
    const { result, rerender } = renderHook(
      (props) => getUser.useQuery(props),
      {
        wrapper: withProvider(store),
        initialProps: { name: 'Tim', likes: 'Bananas' },
      },
    )

    await waitFor(() => {
      expect(result.current.status).not.toBe('pending')
    })
    expect(spy).toHaveBeenCalledOnce()

    for (let x = 1; x < 3; x++) {
      rerender({ likes: 'Bananas', name: 'Tim' })
      await waitFor(() => {
        expect(result.current.status).not.toBe('pending')
      })
      expect(spy).toHaveBeenCalledOnce()
    }
  })
})

describe('prefetch', () => {
  const baseQuery = () => ({ data: { name: 'Test User' } })

  const api = createApi({
    baseQuery,
    tagTypes: ['User'],
    endpoints: (build) => ({
      getUser: build.query<any, number>({
        query: (id) => ({ url: `user/${id}` }),
        providesTags: (result, error, id) => [{ type: 'User', id }],
      }),
      updateUser: build.mutation<any, { id: number; name: string }>({
        query: ({ id, name }) => ({
          url: `user/${id}`,
          method: 'PUT',
          body: { name },
        }),
        invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      }),
    }),
    keepUnusedDataFor: 0.1, // 100ms for faster test cleanup
  })

  let storeRef = setupApiStore(
    api,
    { ...actionsReducer },
    {
      withoutListeners: true,
    },
  )

  let getSubscriptions: () => Map<string, any>
  let getSubscriptionCount: (queryCacheKey: string) => number

  beforeEach(() => {
    storeRef = setupApiStore(
      api,
      { ...actionsReducer },
      {
        withoutListeners: true,
      },
    )
    // Get subscription helpers
    const subscriptionSelectors = storeRef.store.dispatch(
      api.internalActions.internal_getRTKQSubscriptions(),
    ) as any
    getSubscriptions = subscriptionSelectors.getSubscriptions
    getSubscriptionCount = subscriptionSelectors.getSubscriptionCount
  })

  describe('subscription behavior', () => {
    it('prefetch should NOT create a subscription', async () => {
      const queryCacheKey = 'getUser(1)'

      // Initially no subscriptions
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)

      // Dispatch prefetch
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, {}))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      expect(getSubscriptionCount(queryCacheKey)).toBe(0)
    })

    it('prefetch allows cache cleanup after keepUnusedDataFor', async () => {
      const queryCacheKey = 'getUser(1)'

      // Prefetch the data
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, {}))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      // Verify data is in cache
      let state = api.endpoints.getUser.select(1)(storeRef.store.getState())
      expect(state.data).toEqual({ name: 'Test User' })

      // Wait longer than keepUnusedDataFor
      await new Promise((resolve) => setTimeout(resolve, 150))

      state = api.endpoints.getUser.select(1)(storeRef.store.getState())
      expect(state.status).toBe('uninitialized')
      expect(state.data).toBeUndefined()
    })

    it('prefetch does NOT trigger refetch on tag invalidation', async () => {
      // Prefetch user 1
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, {}))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      // Verify data is in cache
      let state = api.endpoints.getUser.select(1)(storeRef.store.getState())
      expect(state.data).toEqual({ name: 'Test User' })

      // Invalidate the tag by updating the user
      await storeRef.store.dispatch(
        api.endpoints.updateUser.initiate({ id: 1, name: 'Updated' }),
      )

      // Since there's no subscription, the cache entry gets removed on invalidation
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      // Cache entry should be cleared (no subscription to keep it alive)
      state = api.endpoints.getUser.select(1)(storeRef.store.getState())
      expect(state.status).toBe('uninitialized')
      expect(state.data).toBeUndefined()
    })

    it('multiple prefetches do not accumulate subscriptions', async () => {
      const queryCacheKey = 'getUser(1)'

      expect(getSubscriptionCount(queryCacheKey)).toBe(0)

      // First prefetch
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, {}))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)

      // Second prefetch (force refetch)
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, { force: true }))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      // Still no subscriptions
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)

      // Third prefetch
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, { force: true }))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)
    })

    it('prefetch followed by regular query should work correctly', async () => {
      const queryCacheKey = 'getUser(1)'

      // Prefetch first
      storeRef.store.dispatch(api.util.prefetch('getUser', 1, {}))
      await Promise.all(
        storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
      )

      // No subscription from prefetch
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)

      // Now create a real subscription via initiate
      const promise = storeRef.store.dispatch(api.endpoints.getUser.initiate(1))

      // Should have 1 subscription from the initiate call
      expect(getSubscriptionCount(queryCacheKey)).toBe(1)

      // Unsubscribe
      promise.unsubscribe()

      // Subscription should be cleaned up
      expect(getSubscriptionCount(queryCacheKey)).toBe(0)
    })
  })

  it('prefetch with ifOlderThan dispatches no actions while the cached data is fresh', async () => {
    const promise = storeRef.store.dispatch(api.endpoints.getUser.initiate(1))
    await promise

    const actionCountBefore = storeRef.store.getState().actions.length

    storeRef.store.dispatch(
      api.util.prefetch('getUser', 1, { ifOlderThan: 10 }),
    )
    await Promise.all(
      storeRef.store.dispatch(api.util.getRunningQueriesThunk()),
    )

    expect(storeRef.store.getState().actions.length).toBe(actionCountBefore)

    promise.unsubscribe()
  })
})
