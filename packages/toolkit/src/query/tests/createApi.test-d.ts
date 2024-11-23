import { setupApiStore } from '@internal/tests/utils/helpers'
import type { SerializedError } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import type {
  DefinitionsFromApi,
  FetchBaseQueryError,
  MutationDefinition,
  OverrideResultType,
  QueryDefinition,
  TagDescription,
  TagTypesFromApi,
} from '@reduxjs/toolkit/query'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'

describe('type tests', () => {
  test('sensible defaults', () => {
    const api = createApi({
      baseQuery: fetchBaseQuery(),
      endpoints: (build) => ({
        getUser: build.query<unknown, void>({
          query(id) {
            return { url: `user/${id}` }
          },
        }),
        updateUser: build.mutation<unknown, void>({
          query: () => '',
        }),
      }),
    })

    configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    expectTypeOf(api.reducerPath).toEqualTypeOf<'api'>()

    expectTypeOf(api.util.invalidateTags)
      .parameter(0)
      .toEqualTypeOf<(null | undefined | TagDescription<never>)[]>()
  })

  describe('endpoint definition typings', () => {
    const api = createApi({
      baseQuery: (from: 'From'): { data: 'To' } | Promise<{ data: 'To' }> => ({
        data: 'To',
      }),
      endpoints: () => ({}),
      tagTypes: ['typeA', 'typeB'],
    })

    test('query: query & transformResponse types', () => {
      api.injectEndpoints({
        endpoints: (build) => ({
          query: build.query<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query1: build.query<'RetVal', 'Arg'>({
            // @ts-expect-error
            query: (x: 'Error') => 'From' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query2: build.query<'RetVal', 'Arg'>({
            // @ts-expect-error
            query: (x: 'Arg') => 'Error' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query3: build.query<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            // @ts-expect-error
            transformResponse(r: 'Error') {
              return 'RetVal' as const
            },
          }),
          query4: build.query<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            // @ts-expect-error
            transformResponse(r: 'To') {
              return 'Error' as const
            },
          }),
          queryInference1: build.query<'RetVal', 'Arg'>({
            query: (x) => {
              expectTypeOf(x).toEqualTypeOf<'Arg'>()

              return 'From'
            },
            transformResponse(r) {
              expectTypeOf(r).toEqualTypeOf<'To'>()

              return 'RetVal'
            },
          }),
          queryInference2: (() => {
            const query = build.query({
              query: (x: 'Arg') => 'From' as const,
              transformResponse(r: 'To') {
                return 'RetVal' as const
              },
            })

            expectTypeOf(query).toMatchTypeOf<
              QueryDefinition<'Arg', any, any, 'RetVal'>
            >()

            return query
          })(),
        }),
      })
    })

    test('mutation: query & transformResponse types', () => {
      api.injectEndpoints({
        endpoints: (build) => ({
          query: build.mutation<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query1: build.mutation<'RetVal', 'Arg'>({
            // @ts-expect-error
            query: (x: 'Error') => 'From' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query2: build.mutation<'RetVal', 'Arg'>({
            // @ts-expect-error
            query: (x: 'Arg') => 'Error' as const,
            transformResponse(r: 'To') {
              return 'RetVal' as const
            },
          }),
          query3: build.mutation<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            // @ts-expect-error
            transformResponse(r: 'Error') {
              return 'RetVal' as const
            },
          }),
          query4: build.mutation<'RetVal', 'Arg'>({
            query: (x: 'Arg') => 'From' as const,
            // @ts-expect-error
            transformResponse(r: 'To') {
              return 'Error' as const
            },
          }),
          mutationInference1: build.mutation<'RetVal', 'Arg'>({
            query: (x) => {
              expectTypeOf(x).toEqualTypeOf<'Arg'>()

              return 'From'
            },
            transformResponse(r) {
              expectTypeOf(r).toEqualTypeOf<'To'>()

              return 'RetVal'
            },
          }),
          mutationInference2: (() => {
            const query = build.mutation({
              query: (x: 'Arg') => 'From' as const,
              transformResponse(r: 'To') {
                return 'RetVal' as const
              },
            })

            expectTypeOf(query).toMatchTypeOf<
              MutationDefinition<'Arg', any, any, 'RetVal'>
            >()

            return query
          })(),
        }),
      })
    })

    describe('enhancing endpoint definitions', () => {
      const baseQuery = (x: string) => ({ data: 'success' })

      function getNewApi() {
        return createApi({
          baseQuery,
          tagTypes: ['old'],
          endpoints: (build) => ({
            query1: build.query<'out1', 'in1'>({ query: (id) => `${id}` }),
            query2: build.query<'out2', 'in2'>({ query: (id) => `${id}` }),
            mutation1: build.mutation<'out1', 'in1'>({
              query: (id) => `${id}`,
            }),
            mutation2: build.mutation<'out2', 'in2'>({
              query: (id) => `${id}`,
            }),
          }),
        })
      }

      const api1 = getNewApi()

      test('warn on wrong tagType', () => {
        const storeRef = setupApiStore(api1, undefined, {
          withoutTestLifecycles: true,
        })

        api1.enhanceEndpoints({
          endpoints: {
            query1: {
              // @ts-expect-error
              providesTags: ['new'],
            },
            query2: {
              // @ts-expect-error
              providesTags: ['missing'],
            },
          },
        })

        const enhanced = api1.enhanceEndpoints({
          addTagTypes: ['new'],
          endpoints: {
            query1: {
              providesTags: ['new'],
            },
            query2: {
              // @ts-expect-error
              providesTags: ['missing'],
            },
          },
        })

        storeRef.store.dispatch(api1.endpoints.query1.initiate('in1'))

        storeRef.store.dispatch(api1.endpoints.query2.initiate('in2'))

        enhanced.enhanceEndpoints({
          endpoints: {
            query1: {
              // returned `enhanced` api contains "new" entityType
              providesTags: ['new'],
            },
            query2: {
              // @ts-expect-error
              providesTags: ['missing'],
            },
          },
        })
      })

      test('modify', () => {
        const storeRef = setupApiStore(api1, undefined, {
          withoutTestLifecycles: true,
        })

        api1.enhanceEndpoints({
          endpoints: {
            query1: {
              query: (x) => {
                expectTypeOf(x).toEqualTypeOf<'in1'>()

                return 'modified1'
              },
            },
            query2(definition) {
              definition.query = (x) => {
                expectTypeOf(x).toEqualTypeOf<'in2'>()

                return 'modified2'
              }
            },
            mutation1: {
              query: (x) => {
                expectTypeOf(x).toEqualTypeOf<'in1'>()

                return 'modified1'
              },
            },
            mutation2(definition) {
              definition.query = (x) => {
                expectTypeOf(x).toEqualTypeOf<'in2'>()

                return 'modified2'
              }
            },
            // @ts-expect-error
            nonExisting: {},
          },
        })

        storeRef.store.dispatch(api1.endpoints.query1.initiate('in1'))
        storeRef.store.dispatch(api1.endpoints.query2.initiate('in2'))
        storeRef.store.dispatch(api1.endpoints.mutation1.initiate('in1'))
        storeRef.store.dispatch(api1.endpoints.mutation2.initiate('in2'))
      })

      test('updated transform response types', async () => {
        const baseApi = createApi({
          baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
          tagTypes: ['old'],
          endpoints: (build) => ({
            query1: build.query<'out1', void>({ query: () => 'success' }),
            mutation1: build.mutation<'out1', void>({ query: () => 'success' }),
          }),
        })

        type Transformed = { value: string }

        type Definitions = DefinitionsFromApi<typeof api1>

        type TagTypes = TagTypesFromApi<typeof api1>

        type Q1Definition = OverrideResultType<
          Definitions['query1'],
          Transformed
        >

        type M1Definition = OverrideResultType<
          Definitions['mutation1'],
          Transformed
        >

        type UpdatedDefinitions = Omit<Definitions, 'query1' | 'mutation1'> & {
          query1: Q1Definition
          mutation1: M1Definition
        }

        const enhancedApi = baseApi.enhanceEndpoints<
          TagTypes,
          UpdatedDefinitions
        >({
          endpoints: {
            query1: {
              transformResponse: (a, b, c) => ({
                value: 'transformed',
              }),
            },
            mutation1: {
              transformResponse: (a, b, c) => ({
                value: 'transformed',
              }),
            },
          },
        })

        const storeRef = setupApiStore(enhancedApi, undefined, {
          withoutTestLifecycles: true,
        })

        const queryResponse = await storeRef.store.dispatch(
          enhancedApi.endpoints.query1.initiate(),
        )

        expectTypeOf(queryResponse.data).toMatchTypeOf<
          Transformed | undefined
        >()

        const mutationResponse = await storeRef.store.dispatch(
          enhancedApi.endpoints.mutation1.initiate(),
        )

        expectTypeOf(mutationResponse).toMatchTypeOf<
          | { data: Transformed }
          | { error: FetchBaseQueryError | SerializedError }
        >()
      })
    })
  })
})
