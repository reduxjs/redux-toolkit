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
  keepUnusedDataFor?: number; // value is in seconds
  refetchOnMountOrArgChange?: boolean | number; // value is in seconds
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
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

Accepts a custom function if you have a need to change the creation of cache keys for any reason. Defaults to:

```ts no-compile
export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({ endpoint, queryArgs }) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than  useQuery({ b: 2, a: 1 })
  return `${endpoint}(${JSON.stringify(queryArgs, Object.keys(queryArgs || {}).sort())})`;
};
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

- `onStart`, `onError` and `onSuccess` _(optional)_ - Available to both [queries](../concepts/queries) and [mutations](../concepts/mutations)
  - Can be used in `mutations` for [optimistic updates](../concepts/optimistic-updates).
  - ```ts title="Mutation lifecycle signatures"
    function onStart(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>): void;
    function onError(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, error: unknown): void;
    function onSuccess(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, result: ResultType): void;
    ```
  - ```ts title="Query lifecycle signatures"
    function onStart(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>): void;
    function onError(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>, error: unknown): void;
    function onSuccess(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>, result: ResultType): void;
    ```

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

### `keepUnusedDataFor`

Defaults to `60` _(this value is in seconds)_. This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.

### `refetchOnMountOrArgChange`

Defaults to `false`. This setting allows you to control whether RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.

- `false` - Will not cause a query to be performed _unless_ it does not exist yet.
- `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
- `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnMountOrArgChange` to each individual hook call or when dispatching the [`initiate`](#initiate) action.
:::

### `refetchOnFocus`

Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnFocus` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

### `refetchOnReconnect`

Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnReconnect` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

## Return value

- [`reducerPath`](#reducerpath)
- [`reducer`](#reducer)
- [`middleware`](#middleware)
- [`endpoints`](#endpoints-returned-by-createapi)
  - **[endpointName]**
    - [`initiate`](#initiate)
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

#### initiate

React Hooks users will most likely never need to use these in most cases. These are redux action creators that you can `dispatch` with `useDispatch` or `store.dispatch()`.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. Also, you have to manually unsubscribe once your component unmounts. To get an idea of what that entails, see the [Svelte Example](../examples/svelte) or the [React Class Components Example](../examples/react-class-components)
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

#### action matchers

These are action matchers for each endpoint to allow you matching on redux actions for that endpoint - for example in slice `extraReducers` or a custom middleware. Those are implemented as follows:

```ts
 matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
 matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
 matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
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

:::danger
These may change at any given time and are not part of the public API for now
:::

- `updateSubscriptionOptions: ActionCreatorWithPayload<{ endpoint: string; requestId: string; options: SubscriptionOptions; queryCacheKey: QueryCacheKey }, string>;`
- `queryResultPatched: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, patches: Patch[]; }, string>`
- `removeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey }, string>`
- `unsubscribeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, requestId: string }, string>`,
- `unsubscribeMutationResult: ActionCreatorWithPayload<MutationSubstateIdentifier, string>`,

### `util`

- **prefetchThunk** - used for [prefetching](../concepts/prefetching).
- **patchQueryResult** - used for [optimistic updates](../concepts/optimistic-updates).
- **updateQueryResult** - used for [optimistic updates](../concepts/optimistic-updates).

### `injectEndpoints`

See [Code Splitting](../concepts/code-splitting)
