---
id: createApi
title: createApi
sidebar_label: createApi
hide_title: true
---

# `createApi`

The main point where you will define a service to use in your application.

## Parameters

`createApi` accepts a single configuration object parameter with the following options:

```ts no-transpile
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<InternalQueryArgs>;
  keepUnusedDataFor?: number;
```

**It returns:**

- [`reducerPath`](#reducerpath)
- [`reducer`](#reducer)
- [`middleware`](#middleware)
- [`endpoints`](#endpoints-returned-by-createapi)
  - **[endpointName]**
    - [`initiate`](#actions)
    - [`select`](#select)
    - [`useQuery or useMutation`](#hooks)
- [`internalActions`](#internalactions)
- [`util`](#util)
- [`injectEndpoints`](#injectendpoints)
- [`usePrefetch`](../concepts/prefetching#prefetching-with-react-hooks)
- [`Auto-generated hooks`](#auto-generated-hooks)

```ts title="All returned properties"
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...
  }),
});

export const {
  reducerPath,
  reducer,
  middleware,
  endpoints,
  internalActions,
  util,
  injectEndpoints,
  usePrefetch,
  ...generatedHooks
} = api;
```

#### middleware

This is a standard redux middleware and is responsible for things like [polling](../concepts/polling), [garbage collection](#keepunuseddatafor) and a handful of other things. Make sure it's [included in your store](../introduction/getting-started#add-the-service-to-your-store).

#### reducer

A standard redux reducer that enables core functionality. Make sure it's [included in your store](../introduction/getting-started#add-the-service-to-your-store).

### `endpoints` returned by `createApi`

#### actions

React Hooks users will most likely never need to use these in most cases. These are redux action creators that you can `dispatch` with `useDispatch` or `store.dispatch()`.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. To get an idea of what that entails, see the [Svelte Example](../examples/svelte) or the [React Class Components Example](../examples/react-class-components)
:::

#### select

`select` is how you access your `query` or `mutation` data from the cache. If you're using Hooks, you don't have to worry about this in most cases. There are several ways to use them:

```js title="React Hooks"
const { data, status } = useSelector(api.getPosts.select());
```

```js title="Using connect from react-redux"
const mapStateToProps = (state) => ({
  data: api.getPosts.select()(state),
});
connect(null, mapStateToProps);
```

```js title="Svelte"
$: ({ data, status } = api.getPosts.select()($store));
```

#### hooks

Hooks are specifically for React Hooks users. Under each `api.endpoint.[endpointName]`, you will have `useQuery` or `useMutation` depending on the type. For example, if you had `getPosts` and `updatePost`, these options would be available:

```ts title="Hooks usage"
const { data } = api.endpoints.getPosts.useQuery();
const { data } = api.endpoints.updatePost.useMutation();

const { data } = api.useGetPostsQuery();
const [updatePost] = api.useUpdatePostMutation();
```

### `baseQuery`

```ts title="Simulating axios-like interceptors with a custom base query"
const baseQuery = fetchBaseQuery({ baseUrl: '/' });

function baseQueryWithReauth(arg, api) {
  let result = baseQuery(arg, api);
  if (result.error && result.error.status === '401') {
    // try to get a new token
    const refreshResult = baseQuery('/refreshToken');
    if (refreshResult.data) {
      // store the new token
      dispatch(setToken(refreshResult.data));
      // retry the initial query
      result = baseQuery(arg, api);
    } else {
      dispatch(loggedOut());
    }
  }
  return result;
}
```

### `entityTypes`

Specifying entity types is optional, but you should define them so that they can be used for caching and invalidation. When defining an entity type, you will be able to add them with `provides` and [invalidate](../concepts/mutations#advanced-mutations-with-revalidation) them with `invalidates` when configuring [endpoints](#endpoints).

### `reducerPath`

The `reducerPath` is a _unique_ key that your service will be mounted to in your store. If you call `createApi` more than once in your application, you will need to provide a unique value each time. Defaults to `api`.

```js title="apis.js"
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

const apiOne = createApi({
  reducerPath: 'apiOne',
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...endpoints
  }),
});

const apiTwo = createApi({
  reducerPath: 'apiTwo',
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...endpoints
  }),
});
```

### `serializeQueryArgs`

Accepts a custom function if you have a need to change the serialization behavior for any reason. Defaults to:

```ts no-compile
function defaultSerializeQueryArgs(args: any, endpoint: string) {
  return `${endpoint}/${JSON.stringify(args)}`;
}
```

### `endpoints`

Endpoints are just a set of operations that you want to perform against your server. You define them as an object using the builder syntax. There are two basic endpoint types: [`query`](../concepts/queries) and [`mutation`](../concepts/mutations).

#### Anatomy of an endpoint

- `query` _(required)_
  - `query` is the only required property, and can be either a `string` or an `object` that is passed to your `baseQuery`. If you are using [fetchBaseQuery](./fetchBaseQuery), this can be a `string` or an object of properties in `FetchArgs`. If you use your own custom `baseQuery`, you can customize this behavior to your liking
- `transformResponse` _(optional)_

  - A function to manipulate the data returned by a query or mutation
  - ```js title="Unpack a deeply nested collection"
    transformResponse: (response) => response.some.nested.collection;
    ```
    ```js title="Normalize the response data"
    transformResponse: (response) =>
      response.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    ```

- `provides` _(optional)_
  - Used by `queries` to provide entities to the cache
  - Expects an array of entity type strings, or an array of objects of entity types with ids.
    1.  `['Post']` - equivalent to 2
    2.  `[{ type: 'Post' }]` - equivalent to 1
    3.  `[{ type: 'Post', id: 1 }]`
- `invalidates` _(optional)_
  - Used by `mutations` for [cache invalidation](../concepts/mutations#advanced-mutations-with-revalidation) purposes.
  - Expects the same shapes as `provides`

#### How endpoints get used

When defining a key like `getPosts` as shown below, it's important to know that this name will become exportable from `api` and be able to referenced under `api.endpoints.getPosts.useQuery()`, `api.endpoints.getPosts.initiate()` and `api.endpoints.getPosts.select()`. The same thing applies to `mutation`s but they reference `useMutation` instead of `useQuery`.

```ts
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => result.map(({ id }) => ({ type: 'Posts', id })),
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      invalidates: ['Posts'],
    }),
  }),
});

// Auto-generated hooks
export { useGetPostsQuery, useAddPostMutation } = api;

// Possible exports
export const { endpoints, reducerPath, reducer, middleware } = api;
// reducerPath, reducer, middleware are only used in store configuration
// endpoints will have:
// endpoints.getPosts.initiate(), endpoints.getPosts.select(), endpoints.getPosts.useQuery()
// endpoints.addPost.initiate(), endpoints.addPost.select(), endpoints.addPost.useMutation()
// see `createApi` overview for _all exports_
```

#### Transforming the data returned by an endpoint before caching

In some cases, you may want to manipulate the data returned from a query before you put it in the cache. In this instance, you can take advantage of `transformResponse`.

By default, the payload from the server is returned directly.

```ts
function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}
```

To change it, provide a function that looks like:

```ts
transformResponse: (response) => response.some.deeply.nested.property;
```

```ts title="GraphQL transformation example"
export const api = createApi({
  baseQuery: graphqlBaseQuery({
    baseUrl: '/graphql',
  }),
  endpoints: (builder) => ({
    getPosts: builder.query({
      query: () => ({
        body: gql`
          query {
            posts {
              data {
                id
                title
              }
            }
          }
        `,
      }),
      transformResponse: (response) => response.posts.data,
    }),
  }),
});
```

### Auto-generated Hooks

React users are able to take advantage of auto-generated hooks. By default, `createApi` will automatically generate type-safe hooks (TS 4.1+ only) for you based on the name of your endpoints. The general format is `use(Endpointname)(Query|Mutation)` - `use` is prefixed, the first letter of your endpoint name is capitalized, then `Query` or `Mutation` is appended depending on the type.

```js title="Auto-generated hooks example"
const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => 'posts',
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

// Automatically generated from the endpoint names
export { useGetPostsQuery, useAddPostMutation } = api;
```

### `internalActions`

### `util`

### `injectEndpoints`

### `keepUnusedDataFor`

Defaults to `60` _(this value is in seconds)_. This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
