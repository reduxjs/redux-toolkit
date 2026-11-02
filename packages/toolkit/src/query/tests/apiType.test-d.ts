import type {
  Api,
  BaseQueryFn,
  CoreModule,
  DefinitionsFromApi,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query'
import type { reactHooksModuleName } from '@reduxjs/toolkit/query/react'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type ReactHooksModule = typeof reactHooksModuleName

type FetchBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  {},
  FetchBaseQueryMeta
>

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['A', 'B'],
  endpoints: (build) => ({
    getA: build.query<string, number>({ query: (n) => `a/${n}` }),
    setA: build.mutation<string, number>({ query: (n) => `a/${n}` }),
  }),
})

type Definitions = DefinitionsFromApi<typeof api>

describe('type tests', () => {
  test('Api with the core and React modules matches createApi output', () => {
    expectTypeOf(api).not.toBeAny()

    expectTypeOf(api).toEqualTypeOf<
      Api<
        FetchBaseQuery,
        Definitions,
        'api',
        'A' | 'B',
        CoreModule | ReactHooksModule
      >
    >()
  })

  test('an api is assignable to Api with only the core module', () => {
    const coreOnly: Api<FetchBaseQuery, Definitions, 'api', 'A' | 'B'> = api

    expectTypeOf(coreOnly.endpoints.getA.initiate).toBeFunction()

    expectTypeOf(coreOnly.endpoints.getA).not.toHaveProperty('useQuery')
  })

  test('an api is assignable to Api with a wider BaseQuery or any', () => {
    expectTypeOf(api).toMatchTypeOf<
      Api<
        BaseQueryFn,
        Definitions,
        'api',
        'A' | 'B',
        CoreModule | ReactHooksModule
      >
    >()

    // `ApiModules` has `in out` type parameters, so make sure the common
    // `Api<any, ...>` annotation still accepts a concrete api
    expectTypeOf(api).toMatchTypeOf<Api<any, any, any, any, any>>()
  })

  test('Api without the core module only has the other module members', () => {
    type ReactOnly = Api<
      FetchBaseQuery,
      Definitions,
      'api',
      'A' | 'B',
      ReactHooksModule
    >

    expectTypeOf<ReactOnly>().toHaveProperty('usePrefetch')

    expectTypeOf<ReactOnly>().not.toHaveProperty('reducerPath')

    expectTypeOf<ReactOnly['endpoints']['getA']>().toHaveProperty('useQuery')

    expectTypeOf<ReactOnly['endpoints']['getA']>().not.toHaveProperty(
      'initiate',
    )
  })

  test('injectEndpoints and enhanceEndpoints keep the module members', () => {
    const injected = api
      .enhanceEndpoints({ addTagTypes: ['C'] })
      .injectEndpoints({
        endpoints: (build) => ({
          getC: build.query<boolean, void>({
            query: () => 'c',
            providesTags: ['C'],
          }),
        }),
      })

    expectTypeOf(injected).not.toBeAny()

    expectTypeOf(injected.endpoints.getC).not.toBeAny()

    expectTypeOf(injected.endpoints.getC.useQuery).toBeFunction()

    expectTypeOf(injected.endpoints.getA.initiate).toBeFunction()

    injected.util.invalidateTags(['A', 'C'])

    // @ts-expect-error
    injected.util.invalidateTags(['D'])
  })
})
