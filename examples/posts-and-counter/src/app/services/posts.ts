import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

export interface Post {
  id: number;
  name: string;
}

type PostsResponse = Post[];

export const postApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery(),
  entityTypes: ['Posts'], 
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query() {
        return {
          queryString: `posts`,
        };
      },
      provides: (result) => result.map(({ id }) => ({ type: 'Posts', id })), 
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(data) {
        return {
          queryString: `posts`,
          method: 'POST',
          body: JSON.stringify(data),
        };
      },
      invalidates: [{ type: 'Posts' }],
    }),
    getPost: build.query<Post, number>({
      query(id) {
        return {
          queryString: `posts/${id}`,
        };
      },
      provides: (result, id) => [{ type: 'Posts', id }], 
    }),
    updatePost: build.mutation<Post, Partial<Post>>({
      query(data) {
        const { id, ...post } = data;
        return {
          queryString: `posts/${id}`,
          method: 'PUT',
          body: JSON.stringify(post),
        };
      },
      invalidates: (result, { id }) => [{ type: 'Posts', id }],
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          queryString: `posts/${id}`,
          method: 'DELETE',
        };
      },
      invalidates: (_, id) => [{ type: 'Posts', id }], 
    }),
  }),
});
