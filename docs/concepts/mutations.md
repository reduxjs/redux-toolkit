---
id: mutations
title: Mutations
sidebar_label: Mutations
hide_title: true
---

# `Mutations`

Unlike `useQuery`, `useMutation` returns a tuple. The first item in the tuple is the `trigger` function and the second element contains an object with `status`, `error`, and `data`. Additionally, `useMutation` also makes `internalQueryArgs`, `originalArgs`,
and `endpoint` available for inspection.

Also unlike the `useQuery` hook, the `useMutation` hook doesn't execute automatically. To run a mutation you have to call the `trigger` function.

### Basic mutation

This is a modified version of the complete example you can see at the bottom of the page to highlight the `updatePost` mutation. In this scenario, a post is fetched with `useQuery`, and then a `EditablePostName` component is rendered that allows us to edit the name of the post.

```ts title="src/features/posts/PostDetail.tsx"
export const PostDetail = () => {
  const { id } = useParams<{ id: any }>();

  const { data: post, status } = postApi.hooks.getPost.useQuery(id);

  const [
    updatePost, // This is the mutation trigger
    { status: updateStatus }, // You can inspect the status of the mutation
  ] = postApi.hooks.updatePost.useMutation();

  return (
    <Box p={4}>
      <EditablePostName
        name={post.name}
        onUpdate={(name) => {
          // Execute the trigger with the `id` and updated `name`
          return updatePost({ id, name })
            .then((result) => {
              // Handle the success!
              console.log('Update Result', result);
            })
            .catch((error) => console.error('Update Error', error));
        }}
        isLoading={updateStatus === QueryStatus.pending}
      />
    </Box>
  );
};
```

### Advanced mutations with revalidation

In the real world, it's very common that a developer would want to resync their local data cache with the server after performing a mutation. RTK Query takes a more centralized approach to this and requires you to configure the invalidation behavior in your API service definition. Before getting started, let's cover some new terms:

1. **Entities**

- In short, entities are just a name that you can give to a specific collection of data to control caching and invalidation behavior. For example, in an application that has both `Posts` and `Users`, you would define `entityTypes: ['Posts', 'Users']` when calling `createApi`.

2. **Provides**

- A `query` can _provide_ entities to the cache.
  - Accepts either an array of `{type: string, id?: string|number}` or a callback that returns such an array. That function will be passed the result as the first argument and the argument originally passed into the `query` method as the second argument

3. **Invalidates**

- A `mutation` can _invalidate_ specific entities in the cache.
  - Can both be an array of `{type: string, id?: string|number}` or a callback that returns such an array. That function will be passed the result as the first argument and the argument originally passed into the `query` method as the second argument

```ts title="src/app/services/posts.ts"
import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

export interface Post {
  id: number;
  name: string;
}

type PostsResponse = Post[];

export const postApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  entityTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => [...result.map(({ id }) => ({ type: 'Posts', id })), { type: 'Posts', id: 'LIST' }], // Provides a list of `Posts` by `id`. If another component calls `getPost(id)` with an `id` that was provided here, it will use the cache instead of making another request. Additionally, it provides a second entity `id` of LIST, which we way may want to use in certain scenarios.
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        };
      },
      invalidates: [{ type: 'Posts', id: 'LIST'], // Invalidates all list-type queries - after all, depending of the sort order, that newly created post could show up in any lists.
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
      invalidates: (_, { id }) => [{ type: 'Posts', id }], // Invalidates all queries that subscribe to this Post `id` only. In this case, `getPost` will be re-run.
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `posts/${id}`,
          method: 'DELETE',
        };
      },
      invalidates: (_, id) => [{ type: 'Posts', id }], // Invalidates all queries that subscribe to this Post `id` only.
    }),
  }),
});
```

:::note Usage without React Hooks
Usage without hooks is very simple. Simply dispatch the desired action creator, and any components that are subscribed to an impacted entity will automatically refetch.

```ts
const { data, error, status } = store.dispatch(api.actions.updateUser(payload, { track: true }));
```

:::

### Example

<iframe src="https://codesandbox.io/embed/concepts-mutations-4d98s?fontsize=14&hidenavigation=1&theme=dark&view=preview"
     style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-query-react-hooks-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
