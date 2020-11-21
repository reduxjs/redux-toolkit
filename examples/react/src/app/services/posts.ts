import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query/dist';

export interface Post {
  id: number;
  name: string;
  fetched_at: string;
}

type PostsResponse = Post[];

export const postApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  entityTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => [
        ...result.map(({ id }) => ({ type: 'Posts', id } as const)),
        { type: 'Posts', id: 'LIST' },
      ],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        };
      },
      invalidates: [{ type: 'Posts', id: 'LIST' }],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      provides: (_, id) => [{ type: 'Posts', id }],
    }),
    updatePost: build.mutation<Post, Partial<Post>>({
      query(data) {
        const { id, ...body } = data;
        return {
          url: `posts/${id}`,
          method: 'PUT',
          body,
        };
      },
      invalidates: (_, { id }) => [{ type: 'Posts', id }],
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `posts/${id}`,
          method: 'DELETE',
        };
      },
      invalidates: (_, id) => [{ type: 'Posts', id }],
    }),
  }),
});
