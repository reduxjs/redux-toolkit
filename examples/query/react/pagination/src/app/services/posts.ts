import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

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

interface ListResponse<T> {
  page: number
  per_page: number
  total: number
  total_pages: number
  data: T[]
}
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: (build) => ({
    listPosts: build.query<ListResponse<Post>, number | void>({
      query: (page = 1) => `posts?page=${page}`,
    }),
  }),
})

export const { useListPostsQuery } = api
