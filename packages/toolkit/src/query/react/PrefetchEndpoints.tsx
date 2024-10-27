import { createApi } from '.'
import type { BaseQueryFn } from '../baseQueryTypes'
import type { ApiEndpointQuery } from '../core'
import type { QueryDefinition } from '../endpointDefinitions'
import { fetchBaseQuery } from '../fetchBaseQuery'
import type { EndpointRequest } from './HydrateEndpoints.cc'
// this needs to be a separately bundled entry point prefixed with "use client"
import { HydrateEndpoints } from './HydrateEndpoints.cc'

interface PrefetchEndpointsProps<BaseQuery extends BaseQueryFn> {
  baseQuery: BaseQueryFn
  run: (
    prefetchEndpoint: <QueryArg, ReturnType>(
      endpoint: ApiEndpointQuery<
        QueryDefinition<QueryArg, BaseQuery, any, ReturnType, any>,
        any
      >,
      arg: QueryArg,
    ) => Promise<ReturnType>,
  ) => Promise<void> | undefined
  children?: any
}

export function PrefetchEndpoints<BaseQuery extends BaseQueryFn>({
  baseQuery,
  run,
  children,
}: PrefetchEndpointsProps<BaseQuery>) {
  const immediateRequests: Array<EndpointRequest> = []
  const lateRequests = generateRequests()
  async function* generateRequests(): AsyncGenerator<EndpointRequest> {
    let resolveNext: undefined | PromiseWithResolvers<EndpointRequest>
    const running = run((endpoint, arg) => {
      // something something magic
      const request = {
        serializedQueryArgs: '...',
        resolvedAndTransformedData: {}, // ...
      } as any as EndpointRequest
      if (!resolveNext) {
        immediateRequests.push(request)
      } else {
        const oldResolveNext = resolveNext
        resolveNext = Promise.withResolvers()
        oldResolveNext.resolve(request)
      }
      return request.resolvedAndTransformedData
    })

    // not an async function, no need to wait for late requests
    if (!running) return

    let runningResolved = false
    running.then(() => {
      runningResolved = true
    })

    resolveNext = Promise.withResolvers()
    while (!runningResolved) {
      yield await resolveNext.promise
    }
  }
  return (
    <HydrateEndpoints
      immediateRequests={immediateRequests}
      lateRequests={lateRequests}
    >
      {children}
    </HydrateEndpoints>
  )
}

// usage:

const baseQuery = fetchBaseQuery()
const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    foo: build.query<string, string>({
      query(arg) {
        return { url: '/foo' + arg }
      },
    }),
  }),
})

function Page() {
  return (
    <PrefetchEndpoints
      baseQuery={baseQuery}
      run={async (prefetch) => {
        // immediate prefetching
        const promise1 = prefetch(api.endpoints.foo, 'bar')
        const promise2 = prefetch(api.endpoints.foo, 'baz')
        // and a "dependent endpoint" that can only be prefetched with the result of the first two
        const result1 = await promise1
        const result2 = await promise2
        prefetch(api.endpoints.foo, result1 + result2)
      }}
    >
      foo
    </PrefetchEndpoints>
  )
}
