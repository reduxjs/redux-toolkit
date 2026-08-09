import { createSlice, createAction } from '@reduxjs/toolkit'
import type { CombinedState } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query'
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

  // INV-Q-071: resetApiState resets every api slice and leaves non-api state untouched
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

  // INV-Q-042: provided tags are written on fulfilled and on rejectedWithValue
  // INV-Q-043: provided tags are replaced, not merged, on each successful result
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

  // INV-Q-040: rehydration restores only `fulfilled` and `rejected` entries; `pending` entries are dropped
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

  // INV-Q-033: `merge` runs only when the entry already has data; the first response bypasses it
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

  // INV-Q-033: `merge` may mutate the Immer draft or return a replacement value
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
