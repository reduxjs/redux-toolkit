import { emptySplitApi, PostsResponse } from '.'

export const apiWithPosts = emptySplitApi.injectEndpoints({
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      providesTags: (result = []) =>
        result.map(({ id }) => ({ type: 'Posts', id })),
    }),
  }),
})
