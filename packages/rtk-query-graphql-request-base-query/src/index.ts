import { isPlainObject } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { DocumentNode } from 'graphql'
import type { RequestOptions } from 'graphql-request'
import { GraphQLClient, ClientError } from 'graphql-request'
import type {
  ErrorResponse,
  GraphqlRequestBaseQueryArgs,
  PrepareHeaders,
  RequestHeaders,
} from './GraphqlBaseQueryTypes'

export const graphqlRequestBaseQuery = <E = ErrorResponse>(
  options: GraphqlRequestBaseQueryArgs<E>,
): BaseQueryFn<
  { document: string | DocumentNode; variables?: any },
  unknown,
  E,
  Partial<Pick<ClientError, 'request' | 'response'>>
> => {
  const client =
    'client' in options ? options.client : new GraphQLClient(options.url)
  const requestHeaders: RequestHeaders =
    'requestHeaders' in options ? options.requestHeaders : {}

  return async (
    { document, variables },
    { getState, endpoint, forced, type, signal, extra },
  ) => {
    try {
      const prepareHeaders: PrepareHeaders =
        options.prepareHeaders ?? ((x) => x)
      const headers = new Headers(stripUndefined(requestHeaders))

      const preparedHeaders = await prepareHeaders(headers, {
        getState,
        endpoint,
        forced,
        type,
        extra,
      })

      return {
        data: await client.request({
          document,
          variables,
          signal: signal as unknown as RequestOptions['signal'],
          requestHeaders: preparedHeaders,
        }),
        meta: {},
      }
    } catch (error) {
      if (error instanceof ClientError) {
        const { name, message, stack, request, response } = error

        const customErrors =
          options.customErrors ?? (() => ({ name, message, stack }))

        const customizedErrors = customErrors(error) as E

        return { error: customizedErrors, meta: { request, response } }
      }
      // Base queries should never throw, but return {error}.
      // This also ensures that retry logic works correctly.
      const err = error as Error
      return {
        error: {
          name: err?.name || 'NetworkError',
          message: err?.message || 'An unknown network error occurred',
          stack: err?.stack,
        } as E,
        meta: {},
      }
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
