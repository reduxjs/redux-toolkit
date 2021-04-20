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
  endpoints(build: EndpointBuilder<InternalQueryArgs, TagTypes>): Definitions;
  tagTypes?: readonly TagTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<InternalQueryArgs>;
  keepUnusedDataFor?: number; // value is in seconds
  refetchOnMountOrArgChange?: boolean | number; // value is in seconds
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
```

### `baseQuery`

[summary](docblock://createApi.ts?token=CreateApiOptions.baseQuery)

[examples](docblock://createApi.ts?token=CreateApiOptions.baseQuery)

### `tagTypes`

[summary](docblock://createApi.ts?token=CreateApiOptions.tagTypes)

### `reducerPath`

[summary](docblock://createApi.ts?token=CreateApiOptions.reducerPath)

[examples](docblock://createApi.ts?token=CreateApiOptions.reducerPath)

### `serializeQueryArgs`

[summary](docblock://createApi.ts?token=CreateApiOptions.serializeQueryArgs)

Defaults to:

```ts no-compile
export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({ endpoint, queryArgs }) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than useQuery({ b: 2, a: 1 })
  return `${endpoint}(${JSON.stringify(queryArgs, Object.keys(queryArgs || {}).sort())})`;
};
```

### `endpoints`

[summary](docblock://createApi.ts?token=CreateApiOptions.endpoints)

#### Anatomy of an endpoint

- `query` _(required)_
  - [summary](docblock://endpointDefinitions.ts?token=EndpointDefinitionWithQuery.query)
- `transformResponse` _(optional)_

  - [summary](docblock://endpointDefinitions.ts?token=EndpointDefinitionWithQuery.transformResponse)
  - ```js title="Unpack a deeply nested collection"
    transformResponse: (response) => response.some.nested.collection;
    ```
  - ```js title="Normalize the response data"
    transformResponse: (response) =>
      response.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    ```

- `provides` _(optional)_

  [summary](docblock://endpointDefinitions.ts?token=QueryExtraOptions.provides)

- `invalidates` _(optional)_

  [summary](docblock://endpointDefinitions.ts?token=MutationExtraOptions.invalidates)

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
      provides: (result) => result ? result.map(({ id }) => ({ type: 'Posts', id })) : [],
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

[summary](docblock://createApi.ts?token=CreateApiOptions.keepUnusedDataFor)

### `refetchOnMountOrArgChange`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnMountOrArgChange)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnMountOrArgChange` to each individual hook call or when dispatching the [`initiate`](#initiate) action.
:::

### `refetchOnFocus`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnFocus)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnFocus` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

### `refetchOnReconnect`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnReconnect)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnReconnect` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

## Return value

See [the "created Api" API reference](./created-api/overview)
