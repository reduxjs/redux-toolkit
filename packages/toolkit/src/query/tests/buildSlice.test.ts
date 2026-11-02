import type { Middleware, UnknownAction } from '@reduxjs/toolkit'
import { configureStore, createSlice, createAction } from '@reduxjs/toolkit'
import type { CombinedState, QueryCacheKey } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { setupApiStore } from '../../tests/utils/helpers'

let shouldApiResponseSuccess = true

const rehydrateAction = createAction<{ api: CombinedState<any, any, any> }>(
  'persist/REHYDRATE',
)

const baseQuery = (args?: any) => ({ data: args })
const api = createApi({
  baseQuery,
  tagTypes: ['SUCCEED', 'FAILED'],
  endpoints: (build) => ({
    getUser: build.query<{ url: string; success: boolean }, number>({
      query(id) {
        return { url: `user/${id}`, success: shouldApiResponseSuccess }
      },
      providesTags: (result) => (result?.success ? ['SUCCEED'] : ['FAILED']),
    }),
  }),
  extractRehydrationInfo(action, { reducerPath }) {
    if (rehydrateAction.match(action)) {
      return action.payload?.[reducerPath]
    }
    return undefined
  },
})
const { getUser } = api.endpoints

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: '1234',
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload
    },
  },
})

const storeRef = setupApiStore(api, { auth: authSlice.reducer })

describe('buildSlice', () => {
  beforeEach(() => {
    shouldApiResponseSuccess = true
  })

  it('only resets the api state when resetApiState is dispatched', async () => {
    storeRef.store.dispatch({ type: 'unrelated' }) // trigger "registered middleware" into place
    const initialState = storeRef.store.getState()

    await storeRef.store.dispatch(
      getUser.initiate(1, { subscriptionOptions: { pollingInterval: 10 } }),
    )

    const initialQueryState = {
      api: {
        config: {
          focused: true,
          invalidationBehavior: 'delayed',
          keepUnusedDataFor: 60,
          middlewareRegistered: true,
          online: true,
          reducerPath: 'api',
          refetchOnFocus: false,
          refetchOnMountOrArgChange: false,
          refetchOnReconnect: false,
        },
        mutations: {},
        provided: expect.any(Object),
        queries: {
          'getUser(1)': {
            data: {
              success: true,
              url: 'user/1',
            },
            endpointName: 'getUser',
            fulfilledTimeStamp: expect.any(Number),
            originalArgs: 1,
            requestId: expect.any(String),
            startedTimeStamp: expect.any(Number),
            status: 'fulfilled',
          },
        },
        // Filled some time later
        subscriptions: {},
      },
      auth: {
        token: '1234',
      },
    }

    expect(storeRef.store.getState()).toEqual(initialQueryState)

    storeRef.store.dispatch(api.util.resetApiState())

    expect(storeRef.store.getState()).toEqual(initialState)
  })

  it('replaces previous tags with new provided tags', async () => {
    await storeRef.store.dispatch(getUser.initiate(1))

    expect(
      api.util.selectInvalidatedBy(storeRef.store.getState(), ['SUCCEED']),
    ).toHaveLength(1)
    expect(
      api.util.selectInvalidatedBy(storeRef.store.getState(), ['FAILED']),
    ).toHaveLength(0)

    shouldApiResponseSuccess = false

    storeRef.store.dispatch(getUser.initiate(1)).refetch()

    await delay(10)

    expect(
      api.util.selectInvalidatedBy(storeRef.store.getState(), ['SUCCEED']),
    ).toHaveLength(0)
    expect(
      api.util.selectInvalidatedBy(storeRef.store.getState(), ['FAILED']),
    ).toHaveLength(1)
  })

  it('handles extractRehydrationInfo correctly', async () => {
    await storeRef.store.dispatch(getUser.initiate(1))
    await storeRef.store.dispatch(getUser.initiate(2))

    const stateWithUser = storeRef.store.getState()

    storeRef.store.dispatch(api.util.resetApiState())

    storeRef.store.dispatch(rehydrateAction({ api: stateWithUser.api }))

    const rehydratedState = storeRef.store.getState()
    expect(rehydratedState).toEqual(stateWithUser)
  })
})

describe('`merge` callback', () => {
  const baseQuery = (args?: any) => ({ data: args })

  interface Todo {
    id: string
    text: string
  }

  it('Calls `merge` once there is existing data, and allows mutations of cache state', async () => {
    let mergeCalled = false
    let queryFnCalls = 0
    const todoTexts = ['A', 'B', 'C', 'D']

    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        getTodos: build.query<Todo[], void>({
          async queryFn() {
            const text = todoTexts[queryFnCalls]
            return { data: [{ id: `${queryFnCalls++}`, text }] }
          },
          merge(currentCacheValue, responseData) {
            mergeCalled = true
            currentCacheValue.push(...responseData)
          },
        }),
      }),
    })

    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const selectTodoEntry = api.endpoints.getTodos.select()

    const res = storeRef.store.dispatch(api.endpoints.getTodos.initiate())
    await res
    expect(mergeCalled).toBe(false)
    const todoEntry1 = selectTodoEntry(storeRef.store.getState())
    expect(todoEntry1.data).toEqual([{ id: '0', text: 'A' }])

    res.refetch()

    await delay(10)

    expect(mergeCalled).toBe(true)
    const todoEntry2 = selectTodoEntry(storeRef.store.getState())

    expect(todoEntry2.data).toEqual([
      { id: '0', text: 'A' },
      { id: '1', text: 'B' },
    ])
  })

  it('Allows returning a different value from `merge`', async () => {
    let firstQueryFnCall = true

    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        getTodos: build.query<Todo[], void>({
          async queryFn() {
            const item = firstQueryFnCall
              ? { id: '0', text: 'A' }
              : { id: '1', text: 'B' }
            firstQueryFnCall = false
            return { data: [item] }
          },
          merge(currentCacheValue, responseData) {
            return responseData
          },
        }),
      }),
    })

    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const selectTodoEntry = api.endpoints.getTodos.select()

    const res = storeRef.store.dispatch(api.endpoints.getTodos.initiate())
    await res

    const todoEntry1 = selectTodoEntry(storeRef.store.getState())
    expect(todoEntry1.data).toEqual([{ id: '0', text: 'A' }])

    res.refetch()

    await delay(10)

    const todoEntry2 = selectTodoEntry(storeRef.store.getState())

    expect(todoEntry2.data).toEqual([{ id: '1', text: 'B' }])
  })
})

describe('provided tag cleanup', () => {
  it('removes the cache key from tags with a falsy id', async () => {
    const api = createApi({
      baseQuery,
      tagTypes: ['Post'],
      endpoints: (build) => ({
        getPost: build.query<unknown, void>({
          query: () => '/post',
          providesTags: [{ type: 'Post', id: 0 }],
          keepUnusedDataFor: 0,
        }),
      }),
    })

    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const promise = storeRef.store.dispatch(api.endpoints.getPost.initiate())
    await promise
    promise.unsubscribe()

    await delay(10)

    const state = storeRef.store.getState().api
    expect(state.queries).toEqual({})
    expect(Object.values(state.provided.tags.Post ?? {}).flat()).toEqual([])
  })
})

describe('skipping unneeded reducer work', () => {
  const createTagApi = () =>
    createApi({
      baseQuery,
      tagTypes: ['Item', 'Other'],
      endpoints: (build) => ({
        getItem: build.query<{ id: number }, number>({
          queryFn: (id) => ({ data: { id } }),
          providesTags: (_result, _error, id) => [{ type: 'Item', id }],
        }),
      }),
    })

  function createRecordingStore(api: ReturnType<typeof createTagApi>) {
    const actions: UnknownAction[] = []
    const recorder: Middleware = () => (next) => (action) => {
      actions.push(action as UnknownAction)
      return next(action)
    }
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware, recorder),
    })
    return { store, actions }
  }

  test('unrelated actions return the same api state reference', () => {
    const api = createTagApi()
    const state = api.reducer(undefined, { type: 'init' })

    expect(api.reducer(state, { type: 'some/unrelated' })).toBe(state)
    expect(api.reducer(state, { type: 'apiSomething/else' })).toBe(state)
  })

  test('still handles actions without the reducerPath prefix', () => {
    const api = createTagApi()
    const initial = api.reducer(undefined, { type: 'init' })

    const offline = api.reducer(initial, api.internalActions.onOffline())
    expect(offline.config.online).toBe(false)
    expect(
      api.reducer(offline, api.internalActions.onOnline()).config.online,
    ).toBe(true)

    const unfocused = api.reducer(initial, api.internalActions.onFocusLost())
    expect(unfocused.config.focused).toBe(false)
    expect(
      api.reducer(unfocused, api.internalActions.onFocus()).config.focused,
    ).toBe(true)
  })

  test('fills in missing keys of a partial preloaded state on Redux init', () => {
    const api = createTagApi()
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      preloadedState: {
        api: { queries: {} } as unknown as ReturnType<typeof api.reducer>,
      },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    expect(store.getState().api).toEqual(
      api.reducer(undefined, { type: 'init' }),
    )
  })

  test('re-dispatching a fulfilled action with unchanged tags does not change state', async () => {
    const api = createTagApi()
    const { store, actions } = createRecordingStore(api)
    await store.dispatch(api.endpoints.getItem.initiate(1))
    await store.dispatch(api.endpoints.getItem.initiate(2))

    const fulfilled = actions.findLast(api.endpoints.getItem.matchFulfilled)!
    const before = store.getState().api

    store.dispatch(fulfilled)

    expect(store.getState().api.provided).toBe(before.provided)
    expect(store.getState().api).toBe(before)
  })

  test('updateProvidedBy only rewrites entries whose tags changed', () => {
    const api = createTagApi()
    const { updateProvidedBy } = api.internalActions
    const queryCacheKey = 'getItem(1)' as QueryCacheKey
    const otherCacheKey = 'getItem(2)' as QueryCacheKey

    const state = api.reducer(
      undefined,
      updateProvidedBy([
        { queryCacheKey, providedTags: [{ type: 'Item', id: 1 }] },
        {
          queryCacheKey: otherCacheKey,
          providedTags: [{ type: 'Item', id: 2 }],
        },
      ]),
    )

    const unchanged = api.reducer(
      state,
      updateProvidedBy([
        { queryCacheKey, providedTags: [{ type: 'Item', id: 1 }] },
      ]),
    )
    expect(unchanged).toBe(state)

    const changed = api.reducer(
      state,
      updateProvidedBy([
        { queryCacheKey, providedTags: [{ type: 'Other', id: 1 }] },
        {
          queryCacheKey: otherCacheKey,
          providedTags: [{ type: 'Item', id: 2 }],
        },
      ]),
    )
    expect(changed.provided.keys[queryCacheKey]).toEqual([
      { type: 'Other', id: 1 },
    ])
    expect(changed.provided.tags.Item[1]).toEqual([])
    expect(changed.provided.tags.Other[1]).toEqual([queryCacheKey])
    expect(changed.provided.keys[otherCacheKey]).toBe(
      state.provided.keys[otherCacheKey],
    )
    expect(changed.provided.tags.Item[2]).toBe(state.provided.tags.Item[2])

    // A later entry for the same key wins, even if it matches the old tags
    const reverted = api.reducer(
      state,
      updateProvidedBy([
        { queryCacheKey, providedTags: [{ type: 'Other', id: 1 }] },
        { queryCacheKey, providedTags: [{ type: 'Item', id: 1 }] },
      ]),
    )
    expect(reverted.provided.keys[queryCacheKey]).toEqual([
      { type: 'Item', id: 1 },
    ])
    expect(reverted.provided.tags.Item[1]).toEqual([queryCacheKey])
    expect(reverted.provided.tags.Other[1]).toEqual([])
  })
})

describe('query cache entry writes', () => {
  test('store subscribers never see a new cache entry in the uninitialized state', async () => {
    const api = createApi({
      baseQuery: async (arg: string) => {
        await delay(1)
        return { data: arg }
      },
      endpoints: (build) => ({
        getThing: build.query<string, string>({ query: (arg) => arg }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    const statuses: Array<string | undefined> = []
    const unsubscribeStore = store.subscribe(() => {
      statuses.push(store.getState().api.queries['getThing("a")']?.status)
    })

    const promise = store.dispatch(api.endpoints.getThing.initiate('a'))
    await promise
    unsubscribeStore()

    expect(statuses).toContain('pending')
    expect(statuses).not.toContain('uninitialized')
    expect(statuses.at(-1)).toBe('fulfilled')

    promise.unsubscribe()
  })

  test('a thrown query error provides no tags, while a returned error does', async () => {
    const api = createApi({
      baseQuery: async () => ({ data: null }),
      tagTypes: ['Thing'],
      endpoints: (build) => ({
        thrown: build.query<string, void>({
          queryFn: async () => {
            throw new Error('thrown from queryFn')
          },
          providesTags: ['Thing'],
        }),
        returned: build.query<string, void>({
          queryFn: async () => ({ error: { status: 400, data: 'returned' } }),
          providesTags: ['Thing'],
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    await store.dispatch(
      api.endpoints.thrown.initiate(undefined, { subscribe: false }),
    )
    await store.dispatch(
      api.endpoints.returned.initiate(undefined, { subscribe: false }),
    )

    expect(
      api.util
        .selectInvalidatedBy(store.getState(), ['Thing'])
        .map((entry) => entry.endpointName),
    ).toEqual(['returned'])
  })
})

describe('mutation cache entry writes', () => {
  test('a mutation result replaces data without structural sharing', async () => {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<{ items: { id: number }[] }, void>({
          structuralSharing: true,
          queryFn: () => ({ data: { items: [{ id: 1 }] } }),
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    await store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    const firstData = store.getState().api.mutations.shared?.data
    await store.dispatch(
      api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
    )
    const secondData = store.getState().api.mutations.shared?.data

    expect(secondData).toEqual(firstData)
    expect(secondData).not.toBe(firstData)
  })
})
