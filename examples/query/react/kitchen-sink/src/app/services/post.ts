import { api } from './api'
import { Post } from './posts'

export const postApi = api.injectEndpoints({
  endpoints: (build) => ({
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        }
      },
      invalidatesTags: ['Posts'],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Posts', id }],
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
  }),
})
