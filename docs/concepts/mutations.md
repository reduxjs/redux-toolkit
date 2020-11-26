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

```js title="Example of all mutation endpoint options"
const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    updatePost: build.mutation({
      query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
      // onStart, onSuccess, onError are useful for optimistic updates
      onStart({ id, ...patch }, mutationApi) {},
      onSuccess({ id }, { dispatch, getState, extra, requestId, context }, result) {}, // result is the server response, the 2nd parameter is the destructured `mutationApi`
      onError({ id }, { dispatch, getState, extra, requestId, context }) {},
      invalidates: ['Post'],
    }),
  }),
});
```

:::info
Notice the `onStart`, `onSuccess`, `onError` methods? Make sure to check out how they can be used for [optimistic updates](./optimistic-updates)
:::

### Type interfaces

```ts title="Mutation endpoint definition"
export interface MutationDefinition<
  QueryArg,
  BaseQuery extends (arg: any, ...args: any[]) => any,
  EntityTypes extends string,
  ResultType,
  ReducerPath extends string = string,
  Context = Record<string, any>
> extends BaseEndpointDefinition<QueryArg, BaseQuery, ResultType> {
  type: DefinitionType.mutation;
  invalidates?: ResultDescription<EntityTypes, ResultType, QueryArg>;
  provides?: never;
  onStart?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>): void;
  onError?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, error: unknown): void;
  onSuccess?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, result: ResultType): void;
}
```

```ts title="MutationApi"
export interface MutationApi<ReducerPath extends string, Context extends {}> {
  dispatch: ThunkDispatch<RootState<any, any, ReducerPath>, unknown, AnyAction>;
  getState(): RootState<any, any, ReducerPath>;
  extra: unknown;
  requestId: string;
  context: Context;
}
```

### Basic mutation

This is a modified version of the complete example you can see at the bottom of the page to highlight the `updatePost` mutation. In this scenario, a post is fetched with `useQuery`, and then a `EditablePostName` component is rendered that allows us to edit the name of the post.

```ts title="src/features/posts/PostDetail.tsx"
export const PostDetail = () => {
  const { id } = useParams<{ id: any }>();

  const { data: post } = postApi.hooks.getPost.useQuery(id);

  const [
    updatePost, // This is the mutation trigger
    { isLoading: isUpdating }, // You can use the `isLoading` flag, or do custom logic with `status`
  ] = postApi.hooks.updatePost.useMutation();

  return (
    <Box p={4}>
      <EditablePostName
        name={post.name}
        onUpdate={(name) => {
          // Execute the trigger with the `id` and updated `name`
          return updatePost({ id, name })
            .then((result) => {
              // Do something with the result
              console.log('Update Result', result);
            })
            .catch((error) => console.error('Update Error', error));
        }}
        isLoading={isUpdating}
      />
    </Box>
  );
};
```

### Advanced mutations with revalidation

In the real world, it's very common that a developer would want to resync their local data cache with the server after performing a mutation (aka `revalidation`). RTK Query takes a more centralized approach to this and requires you to configure the invalidation behavior in your API service definition. Before getting started, let's cover some new terms:

1. **Entities**

- In short, entities are just a name that you can give to a specific collection of data to control caching and invalidation behavior. For example, in an application that has both `Posts` and `Users`, you would define `entityTypes: ['Posts', 'Users']` when calling `createApi`.

2. **Provides**

- A `query` can _provide_ entities to the cache.
  - Accepts either an array of `{type: string, id?: string|number}` or a callback that returns such an array. That function will be passed the result as the first argument and the argument originally passed into the `query` method as the second argument.

3. **Invalidates**

- A `mutation` can _invalidate_ specific entities in the cache.
  - Can both be an array of `string` (such as `['Posts']`), `{type: string, id?: string|number}` or a callback that returns such an array. That function will be passed the result as the first argument and the argument originally passed into the `query` method as the second argument.

### Scenarios and Behaviors

RTK Query provides _a lot_ of flexibility for how you can manage the invalidation behavior of your service. Let's look at a few different scenarios:

#### Invalidating everything of a type

```ts title="API Definition"
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  entityTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => [...result.map(({ id }) => ({ type: 'Posts', id }))],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      invalidates: ['Posts'],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      provides: (result, id) => [{ type: 'Posts', id }],
    }),
  }),
});
```

```ts title="App.tsx"
function App() {
  const { data: posts } = hooks.getPosts();
  const [addPost] = hooks.addPost();

  return (
    <div>
      <AddPost onAdd={addPost} />
      <PostsList />
      <PostDetail id={1} /> // Assume each PostDetail is subscribed via `const {data} = hooks.getPost(id)`
      <PostDetail id={2} />
      <PostDetail id={3} />
    </div>
  );
}
```

**What to expect**

When `addPost` is triggered, it would cause each `PostDetail` component to go back into a `isFetching` state because `addPost` invalidates the root entity, which causes _every query_ that provides 'Posts' to be re-run. In most cases, this may not be what you want to do. Imagine if you had 100 posts on the screen that all subscribed to a `getPost` query – in this case, you'd create 100 requests and send a ton of unnecessary traffic to your server, which we're trying to avoid in the first place! Even though the user would still see the last good cached result and potentially not notice anything other than their browser hiccuping, you still want to avoid this.

#### Selectively invalidating lists

Keep an eye on the `provides` property of `getPosts` - we'll explain why after.

```ts title="API Definition"
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  entityTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => [...result.map(({ id }) => ({ type: 'Posts', id })), { type: 'Posts', id: 'LIST' }],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        };
      },
      invalidates: [{ type: 'Posts', id: 'LIST'],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `posts/${id}`,
      provides: (_, id) => [{ type: 'Posts', id }],
    }),
  }),
});
```

> **Note about 'LIST' and `id`s**
>
> 1. `LIST` is an arbitrary string - technically speaking, you could use anything you want here, such as `ALL` or `*`. The important thing when choosing a custom id is to make sure there is no possibility of it colliding with an id that is returned by a query result. If you have unknown ids in your query results and don't want to risk it, you can go with point 3 below.
> 2. You can add _many_ entity types for even more control
>    - `[{ type: 'Posts', id: 'LIST' }, { type: 'Posts', id: 'SVELTE_POSTS' }, { type: 'Posts', id: 'REACT_POSTS' }]`
> 3. If the concept of using an `id` like 'LIST' seems strange to you, you can always add another `entityType` and invalidate it's root, but we recommend using the `id` approach as shown.

```ts title="App.tsx"
function App() {
  const { data: posts } = hooks.getPosts();
  const [addPost] = hooks.addPost();

  return (
    <div>
      <AddPost onAdd={addPost} />
      <PostsList />
      <PostDetail id={1} /> // Assume each PostDetail is subscribed via `const {data} = hooks.getPost(id)`
      <PostDetail id={2} />
      <PostDetail id={3} />
    </div>
  );
}
```

**What to expect**

When `addPost` is fired, it will only cause the `PostsList` to go into an `isFetching` state because `addPost` only invalidates the 'LIST' id, which causes `getPosts` to rerun (because it provides that specific id). So in your network tab, you would only see 1 new request fire for `GET /posts`. Once that resolves and assuming it returned updated data for ids 1, 2, and 3, the `PostDetail` components would then rerender with the latest data.

### Commented Posts Service

This is an example of a [CRUD service](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) for Posts. This implements the [Selectively invalidating lists](#selectively-invalidating-lists) strategy and will most likely serve as a good foundation for real applications.

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
      // Provides a list of `Posts` by `id`.
      // If any mutation is executed that `invalidate`s any of these entities, this query will re-run to be always up-to-date.
      // The `LIST` id is a "virtual id" we just made up to be able to invalidate this query specifically if a new `Posts` element was added.
      provides: (result) => [...result.map(({ id }) => ({ type: 'Posts', id })), { type: 'Posts', id: 'LIST' }],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query(body) {
        return {
          url: `posts`,
          method: 'POST',
          body,
        };
      },
      // Invalidates all Post-type queries providing the `LIST` id - after all, depending of the sort order,
      // that newly created post could show up in any lists.
      invalidates: [{ type: 'Posts', id: 'LIST'],
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
      // Invalidates all queries that subscribe to this Post `id` only.
      // In this case, `getPost` will be re-run. `getPosts` *might*  rerun, if this id was under it's results.
      invalidates: (_, { id }) => [{ type: 'Posts', id }],
    }),
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `posts/${id}`,
          method: 'DELETE',
        };
      },
      // Invalidates all queries that subscribe to this Post `id` only.
      invalidates: (_, id) => [{ type: 'Posts', id }],
    }),
  }),
});
```

### Example

<iframe src="https://codesandbox.io/embed/concepts-mutations-4d98s?fontsize=12&hidenavigation=1&theme=dark&view=preview"
     style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="RTK Query - Mutations Concept"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
