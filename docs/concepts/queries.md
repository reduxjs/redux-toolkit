---
id: queries
title: Queries
sidebar_label: Queries
hide_title: true
---

# `Queries`

This is the most basic feature of `RTK Query`. A `query` can be performed with any data fetching library of your choice, but the general recommendation is that you only use queries for requests that retrieve data. For anything that alters data on the server or will possibly invalidate the cache, you should use a [Mutation](./mutations).

By default, `RTK Query` ships with [fetchBaseQuery](../api/fetchBaseQuery), which is just a lightweight [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) wrapper that automatically handles request headers and response parsing in a manner similar to common libraries like `axios`.

> Depending on your environment, you may need to polyfill `fetch` with `whatwg-fetch` if you choose to use `fetchBaseQuery` or `fetch` on it's own.

### Performing queries with React Hooks

If you're using React Hooks, RTK Query does a few additional things for you. The primary benefit is that you get a render-optimized hook that allows you to have 'background fetching'.

Here is an example of a `PostDetail` component:

```ts title="Example"
export const PostDetail = ({ id }: { id: string }) => {
  const { data: post, isFetching, isLoading } = useGetPostQuery(id, { pollingInterval: 3000 });

  if (isLoading) return <div>Loading...</div>;
  if (!post) return <div>Missing post!</div>;

  return (
    <div>
      {post.name} {isFetching ? '...refetching' : ''}
    </div>
  );
};
```

The way that this component is setup would have some nice traits:

1. It only shows 'Loading...' on the **initial load**

   - **Initial load** is defined as a query that is pending and does not have data in the cache

2. When the request is re-triggered by the polling interval, it will add '...refetching' to the post name
3. If a user closed this `PostDetail`, but then re-opened it within [the allowed time](../api/createApi#keepunuseddatafor), they would immediately be served a cached result and polling would resume with the previous behavior.

### Query Cache Keys

When you perform a query, RTK Query automatically serializes the request parameters and creates an internal `queryCacheKey` for the request. Any future request that produces the same `queryCacheKey` will be de-duped against the original, and will share updates if a `refetch` is trigged on the query from any subscribed component.

### Avoiding unnecessary requests

By default, if you add a component that makes the same query as an existing one, no request will be performed.

In some cases, you may want to skip this behavior and force a refetch - in that case, you can call `refetch` that is returned by the hook.

> If you're not using React Hooks, you can access `refetch` like this:
>
> ```ts
> const { status, data, error, refetch } = dispatch(pokemonApi.endpoints.getPokemon.initiate('bulbasaur'));
> ```

### Observing caching behavior

What you'll see below is this:

1. The first `Pokemon` component mounts and immediately fetches 'bulbasaur'
2. A second later, another `Pokemon` component is rendered with 'bulbasaur'

   - Notice that this one doesn't ever show 'Loading...' and no new network request happens? It's using the cache here.

3. A moment after that, a `Pokemon` component for 'pikachu' is added, and a new request happens.
4. When you click 'Refetch' of a particular pokemon type, it'll update all of them with one request.

:::note Try it out
Click the 'Add bulbasaur' button. You'll observe the same behavior described above until you click the 'Refetch' button on one of the components.
:::

<iframe src="https://codesandbox.io/embed/concepts-queries-deduping-caching-5qy3n?fontsize=12&hidenavigation=1&theme=dark"
     style={{ width: '100%', height: '800px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-query-react-hooks-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
