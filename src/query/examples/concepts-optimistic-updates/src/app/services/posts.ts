import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Patch } from 'immer'

export interface Post {
  id: number
  name: string
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result ? result.map(({ id }) => ({ type: 'Post', id })) : [],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result) => (result ? ['Post'] : []),
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (result, error, id) =>
        result ? [{ type: 'Post', id }] : [],
    }),
    updatePost: build.mutation<
      void,
      Pick<Post, 'id'> & Partial<Post>,
      { undoPost: Patch[] }
    >({
      query: ({ id, ...patch }) => ({
        url: `posts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      onStart({ id, ...patch }, { dispatch, context }) {
        context.undoPost = dispatch(
          api.util.updateQueryResult('getPost', Number(id), (draft) => {
            Object.assign(draft, patch)
          })
        ).inversePatches
      },
      onError({ id }, { dispatch, context }) {
        dispatch(
          api.util.patchQueryResult('getPost', Number(id), context.undoPost)
        )
      },
      invalidatesTags: (_, error, { id }) => [{ type: 'Post', id }, 'Post'],
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `posts/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) =>
        result ? [{ type: 'Post', id }] : [],
    }),
  }),
})

export const {
  useGetPostQuery,
  useGetPostsQuery,
  useAddPostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = api
