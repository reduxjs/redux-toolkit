import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Post {
  id: number
  name: string
}

export type PostsResponse = Post[]

export const emptySplitApi = createApi({
  reducerPath: 'splitApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Posts'],
  endpoints: () => ({}),
})

export const splitApi = emptySplitApi.enhanceEndpoints({
  endpoints: () => ({
    getPost: () => 'test',
  }),
})
