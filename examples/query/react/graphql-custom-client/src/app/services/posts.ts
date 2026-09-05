import {  createApi } from '@reduxjs/toolkit/query/react'
import { gql } from 'graphql-request'
import {graphqlRequestBaseQuery} from '@rtk-query/graphql-request-base-query'
import { GraphQLClient } from "graphql-request";

export const postStatuses = ['draft', 'published', 'pending_review'] as const

export interface Post {
  id: string
  title: string
  author: string
  content: string
  status: typeof postStatuses[number]
  created_at: string
  updated_at: string
}

export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface GetPostsResponse extends Pagination {
  data: {
    posts: Post[]
  }
}

interface PostResponse {
  data: {
    post: Post
  }
}

const client = new GraphQLClient("/graphql", {
  credentials: "include"
});

export const api = createApi({
  baseQuery: graphqlRequestBaseQuery({
    client,
    url: '/graphql',
  }),
  endpoints: (builder) => ({
    getPosts: builder.query<
      GetPostsResponse,
      { page?: number; per_page?: number }
    >({
      query: ({ page, per_page }) => ({
        document: gql`
          query GetPosts($page: Int = 1, $per_page: Int = 10) {
            posts(page: $page, per_page: $per_page) {
              id
              title
            }
          }
        `,
        variables: {
          page,
          per_page,
        },
      }),
    }),
    getPost: builder.query<Post, string>({
      query: (id) => ({
        document: gql`
        query GetPost($id: ID!) {
          post(id: ${id}) {
            id
            title
            body
          }
        }
        `,
      }),
      transformResponse: (response: PostResponse) => response.data.post,
    }),
  }),
})

export const { useGetPostsQuery, useGetPostQuery } = api
