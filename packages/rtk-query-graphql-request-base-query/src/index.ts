import type { DocumentNode } from 'graphql'
import { GraphQLClient, ClientError } from 'graphql-request'
import type {
  BaseQueryFn,
  GraphqlRequestBaseQueryArgs,
} from './GraphqlBaseQueryTypes'

type P = Parameters<GraphQLClient['request']>
export type Document = P[0]
export type Variables = P[1]
export type RequestHeaders = P[2]

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
  return async ({ document, variables }, { getState }) => {
    try {
      client.setHeaders(await prepareHeaders(new Headers({}), { getState }))
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
