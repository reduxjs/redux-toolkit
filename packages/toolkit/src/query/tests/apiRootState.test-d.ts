import { configureStore } from '@reduxjs/toolkit'
import type {
  ApiRootState,
  CombinedState,
  DefinitionsFromApi,
  RootState,
} from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'

describe('ApiRootState', () => {
  const api = createApi({
    reducerPath: 'postsApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Post'],
    endpoints: (build) => ({
      getPosts: build.query<string[], void>({
        queryFn: () => ({ data: [] }),
      }),
    }),
  })

  type Definitions = DefinitionsFromApi<typeof api>

  test('is the same type as RootState', () => {
    expectTypeOf<ApiRootState<Definitions, 'Post', 'postsApi'>>().toEqualTypeOf<
      RootState<Definitions, 'Post', 'postsApi'>
    >()
  })

  test('maps the reducer path to the API slice state', () => {
    expectTypeOf<ApiRootState<Definitions, 'Post', 'postsApi'>>()
      .toHaveProperty('postsApi')
      .toEqualTypeOf<CombinedState<Definitions, 'Post', 'postsApi'>>()
  })

  test('matches the state of a store using the API', () => {
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    expectTypeOf(store.getState()).toExtend<
      ApiRootState<Definitions, 'Post', 'postsApi'>
    >()
  })
})
