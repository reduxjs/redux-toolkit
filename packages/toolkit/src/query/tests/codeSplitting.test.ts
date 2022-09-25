import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { expectType } from './helpers'

function buildInitialApi() {
  return createApi({
    baseQuery: fetchBaseQuery(),
    endpoints(build) {
      return {
        someQuery: build.query<'ReturnedFromQuery', 'QueryArgument'>({
          query() {
            return '/'
          },
        }),
        someMutation: build.query<'ReturnedFromMutation', 'MutationArgument'>({
          query() {
            return '/'
          },
        }),
      }
    },
  })
}
let baseApi = buildInitialApi()
beforeEach(() => {
  baseApi = buildInitialApi()
})
const emptyApiState = {
  [baseApi.reducerPath]: baseApi.reducer(undefined, { type: 'foo' }),
}

test('injectTagTypes', () => {
  const injectedApi = baseApi.addTagTypes('Foo', 'Bar')

  injectedApi.util.selectInvalidatedBy(emptyApiState, ['Foo'])
  // @ts-expect-error
  injectedApi.util.selectInvalidatedBy(emptyApiState, ['Baz'])
})

function getEndpointDetails<
  E extends {
    initiate(arg: any): any
    select: (arg: any) => (state: any) => any
  }
>(
  e: E
): {
  arg: Parameters<E['initiate']>[0]
  returned: NonNullable<ReturnType<ReturnType<E['select']>>['data']>
} {
  return {} as any
}

describe('enhanceEndpoint', () => {
  describe('query', () => {
    test('no changes', () => {
      const injectedApi = baseApi.enhanceEndpoint('someQuery', {})
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someQuery
      )

      expectType<'QueryArgument'>(arg)
      expectType<'ReturnedFromQuery'>(returned)
    })

    test('change return value through `tranformResponse`', () => {
      const injectedApi = baseApi.enhanceEndpoint('someQuery', {
        transformResponse(): 'Changed' {
          return 'Changed'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someQuery
      )

      expectType<'QueryArgument'>(arg)
      expectType<'Changed'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromQuery'>(returned)
    })

    test('change argument value through new `query` function', () => {
      const injectedApi = baseApi.enhanceEndpoint('someQuery', {
        query(arg: 'Changed') {
          return '/'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someQuery
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'QueryArgument'>(arg)
      expectType<'ReturnedFromQuery'>(returned)
    })

    test('change argument and return value through new `query` and `transformResponse` functions', () => {
      const injectedApi = baseApi.enhanceEndpoint('someQuery', {
        query(arg: 'Changed') {
          return ''
        },
        transformResponse(): 'AlsoChanged' {
          return 'AlsoChanged'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someQuery
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'QueryArgument'>(arg)
      expectType<'AlsoChanged'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromQuery'>(returned)
    })

    test('change argument and return value through new `queryFn` function', () => {
      const injectedApi = baseApi.enhanceEndpoint('someQuery', {
        queryFn(arg: 'Changed') {
          return { data: 'AlsoChanged' as const }
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someQuery
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'QueryArgument'>(arg)
      expectType<'AlsoChanged'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromQuery'>(returned)
    })
  })
  describe('mutation', () => {
    test('no changes', () => {
      const injectedApi = baseApi.enhanceEndpoint('someMutation', {})
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someMutation
      )

      expectType<'MutationArgument'>(arg)
      expectType<'ReturnedFromMutation'>(returned)
    })

    test('change return value through `tranformResponse`', () => {
      const injectedApi = baseApi.enhanceEndpoint('someMutation', {
        transformResponse(): 'Changed' {
          return 'Changed'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someMutation
      )

      expectType<'MutationArgument'>(arg)
      expectType<'Changed'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromMutation'>(returned)
    })

    test('change argument value through new `query` function', () => {
      const injectedApi = baseApi.enhanceEndpoint('someMutation', {
        query(arg: 'Changed') {
          return '/'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someMutation
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'MutationArgument'>(arg)
      expectType<'ReturnedFromMutation'>(returned)
    })

    test('change argument and return value through new `queryFn` function', () => {
      const injectedApi = baseApi.enhanceEndpoint('someMutation', {
        query(arg: 'Changed') {
          return ''
        },
        transformResponse(): 'AlsoChanged' {
          return 'AlsoChanged'
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someMutation
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'MutationArgument'>(arg)
      expectType<'AlsoChanged'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromMutation'>(returned)
    })

    test('change argument and return value through new `queryFn` function', () => {
      const injectedApi = baseApi.enhanceEndpoint('someMutation', {
        queryFn(arg: 'Changed') {
          return { data: 'AlsoChanged' as const }
        },
      })
      const { arg, returned } = getEndpointDetails(
        injectedApi.endpoints.someMutation
      )

      expectType<'Changed'>(arg)
      // @ts-expect-error
      expectType<'MutationArgument'>(arg)
      expectType<'AlsoChanged'>(returned)
      // @ts-expect-error
      expectType<'ReturnedFromMutation'>(returned)
    })
  })
})
