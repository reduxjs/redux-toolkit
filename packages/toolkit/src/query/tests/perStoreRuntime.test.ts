import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'

const createTestApi = () => {
  const resolvers: (() => void)[] = []
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getValue: build.query<number, number>({
        queryFn: async (arg) => {
          await new Promise<void>((resolve) => resolvers.push(resolve))
          return { data: arg }
        },
      }),
      setValue: build.mutation<number, number>({
        queryFn: async (arg) => {
          await new Promise<void>((resolve) => resolvers.push(resolve))
          return { data: arg }
        },
      }),
    }),
  })
  const resolveAll = () => resolvers.splice(0).forEach((resolve) => resolve())
  return { api, resolveAll }
}

const createStore = (api: ReturnType<typeof createTestApi>['api']) =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })

describe('per-store runtime', () => {
  test('running queries and mutations are tracked per store', async () => {
    const { api, resolveAll } = createTestApi()
    const storeA = createStore(api)
    const storeB = createStore(api)

    const queryPromise = storeA.dispatch(api.endpoints.getValue.initiate(1))
    const mutationPromise = storeA.dispatch(api.endpoints.setValue.initiate(1))

    expect(storeA.dispatch(api.util.getRunningQueriesThunk())).toEqual([
      queryPromise,
    ])
    expect(storeA.dispatch(api.util.getRunningMutationsThunk())).toEqual([
      mutationPromise,
    ])
    expect(storeB.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    expect(storeB.dispatch(api.util.getRunningMutationsThunk())).toEqual([])

    resolveAll()
    await queryPromise
    await mutationPromise

    expect(storeA.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
    expect(storeA.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
  })

  test('a store without the middleware does not track running requests', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const { api } = createTestApi()
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
      })

      store.dispatch(api.endpoints.getValue.initiate(1))
      store.dispatch(api.endpoints.setValue.initiate(1))

      expect(store.dispatch(api.util.getRunningQueriesThunk())).toEqual([])
      expect(store.dispatch(api.util.getRunningMutationsThunk())).toEqual([])
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
