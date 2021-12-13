import type { DocumentNode } from 'graphql'
import { GraphQLClient, ClientError } from 'graphql-request'
import type {
  BaseQueryFn,
  GraphqlRequestBaseQueryArgs,
  RequestHeaders,
} from './GraphqlBaseQueryTypes'

export const graphqlRequestBaseQuery = ({
  options,
  prepareHeaders = (x) => x,
}: GraphqlRequestBaseQueryArgs): BaseQueryFn<
  { document: string | DocumentNode; variables?: any },
  unknown,
  Pick<ClientError, 'name' | 'message' | 'stack'>,
  Partial<Pick<ClientError, 'request' | 'response'>>
> => {
  const client =
    'client' in options ? options.client : new GraphQLClient(options.url)
  let requestHeaders: RequestHeaders = {}
  if ('requestHeaders' in options) {
    requestHeaders = options.requestHeaders
  }
  return async ({ document, variables }, { getState }) => {
    try {
      const headers = new Headers({})
      if (requestHeaders) {
        for (const [key, value] of Object.entries(requestHeaders)) {
          headers.append(key, value)
        }
      }

      client.setHeaders(await prepareHeaders(headers, { getState }))
      return { data: await client.request(document, variables), meta: {} }
    } catch (error) {
      if (error instanceof ClientError) {
        const { name, message, stack, request, response } = error
        return { error: { name, message, stack }, meta: { request, response } }
      }
      throw error
    }
  }
}
