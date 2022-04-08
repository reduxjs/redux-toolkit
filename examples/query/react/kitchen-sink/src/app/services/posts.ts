import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import { RootState } from '../store'

export interface Post {
  id: number
  name: string
  fetched_at: string
}

type PostsResponse = Post[]

export interface User {
  first_name: string
  last_name: string
  email: string
  phone: string
}

// Create our baseQuery instance
const baseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    // By default, if we have a token in the store, let's use that for authenticated requests
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authentication', `Bearer ${token}`)
    }
    return headers
  },
})

const baseQueryWithRetry = retry(baseQuery, { maxRetries: 6 })

export const postApi = createApi({
  reducerPath: 'postsApi', // We only specify this because there are many services. This would not be common in most applications
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Posts'],
  endpoints: (build) => ({
    login: build.mutation<{ token: string; user: User }, any>({
      query: (credentials: any) => ({
        url: 'login',
        method: 'POST',
        body: credentials,
      }),
      extraOptions: {
        backoff: () => {
          // We intentionally error once on login, and this breaks out of retrying. The next login attempt will succeed.
          retry.fail({ fake: 'error' })
        },
      },
    }),
    getPosts: build.query<PostsResponse, void>({
      query: () => ({ url: 'posts' }),
      providesTags: (result = []) => [
        ...result.map(({ id }) => ({ type: 'Posts', id } as const)),
        { type: 'Posts' as const, id: 'LIST' },
      ],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Posts', id: 'LIST' }],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (_post, _err, id) => [{ type: 'Posts', id }],
    }),
    updatePost: build.mutation<Post, Partial<Post>>({
      query(data) {
        const { id, ...body } = data
        return {
          url: `posts/${id}`,
          method: 'PUT',
          body,
        }
      },
      invalidatesTags: (post) => [{ type: 'Posts', id: post?.id }],
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `posts/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (post) => [{ type: 'Posts', id: post?.id }],
    }),
    getErrorProne: build.query<{ success: boolean }, void>({
      query: () => 'error-prone',
    }),
  }),
})

export const {
  useAddPostMutation,
  useDeletePostMutation,
  useGetPostQuery,
  useGetPostsQuery,
  useLoginMutation,
  useUpdatePostMutation,
  useGetErrorProneQuery,
} = postApi

export const {
  endpoints: { login, getPost },
} = postApi
