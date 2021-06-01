import { BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react'
import { request, gql } from "graphql-request";

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
    posts: Post[];
  }
}

interface PostResponse {
  data: {
    post: Post
  }
}

const graphqlBaseQuery = ({ baseUrl }: { baseUrl: string; } = { baseUrl: '' }): BaseQueryFn<any, unknown, any> => async ({ body, variables }) => {
  const result = await request(baseUrl, body, variables);
  return { data: result };
};

export const api = createApi({
  baseQuery: graphqlBaseQuery({
    baseUrl: "/graphql"
  }),
  endpoints: (builder) => ({
    getPosts: builder.query<GetPostsResponse, { page?: number; per_page?: number; }>({
      query: ({ page, per_page }) => ({
        body: gql`
          query GetPosts($page: Int = 1, $per_page: Int = 10) {
            posts(page: $page, per_page: $per_page) {
              id
              title
            },
          }
        `,
        variables: {
          page,
          per_page
        }
      }),
    }),
    getPost: builder.query<Post, string>({
      query: (id) => ({
        body: gql`
        query GetPost($id: ID!) {
          post(id: ${id}) {
            id
            title
            body
          }
        }
        `
      }),
      transformResponse: (response: PostResponse) => response.data.post
    })
  })
});


export const { useGetPostsQuery, useGetPostQuery } = api