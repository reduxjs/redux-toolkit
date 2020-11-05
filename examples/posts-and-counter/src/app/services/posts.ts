import { createApi } from "@rtk-incubator/simple-query/dist";

export interface Post {
  id: number;
  name: string;
}

type PostsResponse = Post[];

interface QueryArg {
  queryString: string;
  method?: string;
  body?: string;
  headers?: any;
}

export const postApi = createApi({
  reducerPath: "postsApi",
  baseQuery({
    queryString,
    method = "GET",
    body,
    headers = {
      "Content-Type": "application/json"
    }
  }: QueryArg) {
    return fetch(`/${queryString}`, { method, body, headers }).then((res) =>
      res.json()
    );
  },
  entityTypes: ["Posts"], // used for invalidation
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query() {
        return {
          queryString: `posts`
        };
      },
      provides: (result) => result.map(({ id }) => ({ type: "Posts", id })) // this provides entities of the type X - if you use a mutation that impacts this entity it will refetch
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(data) {
        return {
          queryString: `posts`,
          method: "POST",
          body: JSON.stringify(data)
        };
      },
      invalidates: [{ type: "Posts" }]
    }),
    getPost: build.query<Post, number>({
      query(id) {
        return {
          queryString: `posts/${id}`
        };
      },
      provides: (result, id) => [{ type: "Posts", id }] // this provides entities of the type X - if you use a mutation that impacts this entity it will refetch
    }),
    updatePost: build.mutation<Post, Partial<Post>>({
      query(data) {
        const { id, ...post } = data;
        return {
          queryString: `posts/${id}`,
          method: "PUT",
          body: JSON.stringify(post)
        };
      },
      invalidates: (result, { id }) => [{ type: "Posts", id }]
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          queryString: `posts/${id}`,
          method: "DELETE"
        };
      },
      invalidates: (_, id) => [{ type: "Posts", id }] // Will cause a refetch of `getPosts`
    })
  })
});
