import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { setCredentials } from '../../features/auth/authSlice';
import { RootState } from '../store';

export interface Post {
  id: number;
  name: string;
  fetched_at: string;
}

type PostsResponse = Post[];

export interface User {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

// Create our baseQuery instance
const baseQuery = fetchBaseQuery({
  baseUrl: '/',
  prepareHeaders: (headers, { getState }) => {
    // By default, if we have a token in the store, let's use that for authenticated requests
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authentication', `Bearer ${token}`);
    }
    return headers;
  },
});

export const postApi = createApi({
  reducerPath: 'postsApi', // We only specify this because there are many services. This would not be common in most applications
  baseQuery,
  entityTypes: ['Posts'],
  endpoints: (build) => ({
    login: build.mutation<{ token: string; user: User }, any>({
      query: (credentials: any) => ({ url: 'login', method: 'POST', body: credentials }),
      onSuccess: (arg, mutationApi, result) => {
        const { token, user } = result;
        // Set our user and token in the store for future requests
        mutationApi.dispatch(setCredentials({ token, user }));
      },
    }),
    getPosts: build.query<PostsResponse, void>({
      query: () => ({ url: 'posts' }),
      provides: (result) => [
        ...result.map(({ id }) => ({ type: 'Posts', id } as const)),
        { type: 'Posts', id: 'LIST' },
      ],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
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

export const {
  useAddPostMutation,
  useDeletePostMutation,
  useGetPostQuery,
  useGetPostsQuery,
  useLoginMutation,
  useUpdatePostMutation,
} = postApi;

export const {
  endpoints: { login },
} = postApi;
