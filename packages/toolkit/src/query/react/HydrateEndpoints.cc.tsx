import { useStore } from 'react-redux'

export interface EndpointRequest {
  apiPath: string
  serializedQueryArgs: string
  resolvedAndTransformedData: Promise<unknown>
}

interface HydrateEndpointsProps {
  immediateRequests: Array<EndpointRequest>
  lateRequests: AsyncGenerator<EndpointRequest>
  children?: any
}

const seen = new WeakSet<
  Array<EndpointRequest> | AsyncGenerator<EndpointRequest>
>()

export function HydrateEndpoints({
  immediateRequests,
  lateRequests,
  children,
}: HydrateEndpointsProps) {
  if (!seen.has(immediateRequests)) {
    seen.add(immediateRequests)
    for (const request of immediateRequests) {
      handleRequest(request)
    }
  }
  if (!seen.has(lateRequests)) {
    seen.add(lateRequests)
    handleLateRequests()
    async function handleLateRequests() {
      for await (const request of lateRequests) {
        for (const request of immediateRequests) {
          handleRequest(request)
        }
      }
    }
  }
  const store = useStore()
  return children

  async function handleRequest(request: EndpointRequest) {
    store.dispatch({
      type: 'simulate-endpoint-start',
      payload: {
        serializedQueryArgs: request.serializedQueryArgs,
        apiPath: request.apiPath,
      },
    })
    try {
      const data = await request.resolvedAndTransformedData
      store.dispatch({
        type: 'simulate-endpoint-success',
        payload: {
          data,
          serializedQueryArgs: request.serializedQueryArgs,
          apiPath: request.apiPath,
        },
      })
    } catch (error) {
      store.dispatch({
        type: 'simulate-endpoint-error',
        payload: {
          serializedQueryArgs: request.serializedQueryArgs,
          apiPath: request.apiPath,
          // no error details here as it won't be transported over by React
          // to not leak sensitive information from the server
          // that's a good thing
        },
      })
    }
  }
}
