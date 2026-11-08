import { configureStore } from '@reduxjs/toolkit'
import type {
  InfiniteQueryActionCreatorResult,
  QueryActionCreatorResult,
} from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'

const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getPost: build.query<string, number>({
      queryFn: () => ({ data: '' }),
    }),
    getPages: build.infiniteQuery<string, string, number>({
      queryFn: () => ({ data: '' }),
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: () => 1,
      },
    }),
  }),
})

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gDM) => gDM().concat(api.middleware),
})

describe('type tests', () => {
  test('getRunningQuery is typed per endpoint', async () => {
    const running = store.dispatch(api.endpoints.getPost.getRunningQuery(1))
    expectTypeOf(running).toEqualTypeOf<
      | QueryActionCreatorResult<
          (typeof api.endpoints.getPost)['Types']['QueryDefinition']
        >
      | undefined
    >()
    if (running) {
      expectTypeOf((await running).data).toEqualTypeOf<string | undefined>()
    }

    // @ts-expect-error
    api.endpoints.getPost.getRunningQuery('1')

    const pages = store.dispatch(api.endpoints.getPages.getRunningQuery('a'))
    expectTypeOf(pages).toEqualTypeOf<
      | InfiniteQueryActionCreatorResult<
          (typeof api.endpoints.getPages)['Types']['InfiniteQueryDefinition']
        >
      | undefined
    >()
  })

  test('initiate accepts retainFor', () => {
    api.endpoints.getPost.initiate(1, { subscribe: false, retainFor: 30 })
    api.endpoints.getPages.initiate('a', { retainFor: 30 })
    // @ts-expect-error
    api.endpoints.getPost.initiate(1, { retainFor: '30' })
  })
})
