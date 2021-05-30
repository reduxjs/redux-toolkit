import { BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react'
import { request } from 'graphql-request'
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import {
  GetPostsDocument,
  GetPostsQuery,
  GetPostsQueryVariables,
  GetPostDocument,
  GetPostQuery,
} from './graphql.generated'

const graphqlBaseQuery = (
  { baseUrl }: { baseUrl: string } = { baseUrl: '' }
): BaseQueryFn<any, unknown, any> => async ({ body, variables }) => {
  const result = await request(baseUrl, body, variables)
  return { data: result }
}

function nodeQuery<Result, Variables>(
  document: TypedDocumentNode<Result, Variables>
) {
  return (variables: Variables) => ({ body: document, variables })
}

export const api = createApi({
  baseQuery: graphqlBaseQuery({
    baseUrl: '/graphql',
  }),
  endpoints: (builder) => ({
    getPosts: builder.query<GetPostsQuery, GetPostsQueryVariables>({
      query: nodeQuery(GetPostsDocument),
    }),
    getPost: builder.query({
      query: nodeQuery(GetPostDocument),
      transformResponse: (response: GetPostQuery) => response.post,
    }),
  }),
})

export const { useGetPostsQuery, useGetPostQuery } = api
