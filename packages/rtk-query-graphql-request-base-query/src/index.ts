import { isPlainObject } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { DocumentNode } from 'graphql'
import { GraphQLClient, ClientError } from 'graphql-request'
import type {
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
  const requestHeaders: RequestHeaders =
    'requestHeaders' in options ? options.requestHeaders : {}

  return async (
    { document, variables },
    { getState, endpoint, forced, type }
  ) => {
    try {
      const headers = new Headers(stripUndefined(requestHeaders))

      client.setHeaders(
        await prepareHeaders(headers, { getState, endpoint, forced, type })
      )
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

function stripUndefined(obj: any) {
  if (!isPlainObject(obj)) {
    return obj
  }
  const copy: Record<string, any> = { ...obj }
  for (const [k, v] of Object.entries(copy)) {
    if (typeof v === 'undefined') delete copy[k]
  }
  return copy
}
