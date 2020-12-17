---
id: error-handling
title: Error Handling
sidebar_label: Error Handling
hide_title: true
---

# `Error Handling`

If your query or mutation happens to throw an error when using [fetchBaseQuery](../api/fetchBaseQuery), it will be returned in the `error` property of the respective hook.

```ts title="Query Error"
function PostsList() {
  const { data, error } = useGetPostsQuery();

  return (
    <div>
      {error.status} {JSON.stringify(error.data)}
    </div>
  );
}
```

```ts title="Mutation Error"
function AddPost() {
  const [addPost, { error }] = useAddPostMutation();

  return (
    <div>
      {error.status} {JSON.stringify(error.data)}
    </div>
  );
}
```

:::tip
If you need to access the error or success payload immediately after a mutation, you can chain `.unwrap()`.

```ts title="Using .unwrap"
addPost({ id: 1, name: 'Example' })
  .unwrap()
  .then((payload) => console.log('fulfilled', payload))
  .catch((error) => console.error('rejected', error));
```

:::

```ts title="Manually selecting an error"
function PostsList() {
  const { error } = useSelector(api.endpoints.getPosts.select());

  return (
    <div>
      {error.status} {JSON.stringify(error.data)}
    </div>
  );
}
```

## Errors with a custom `baseQuery`

By default, RTK Query expects you to `return` two possible objects:

1.  ```ts title="Expected success result format"
    return { data: { first_name: 'Randy', last_name: 'Banana' };
    ```
2.  ```ts title="Expected error result format"
    return { error: { status: 500, data: { message: 'Failed because of reasons' } };
    ```

:::note
This format is required so that RTK Query can infer the return types for your responses.
:::

As an example, this what a very basic axios-based `baseQuery` utility could look like:

```ts title="Basic axios baseQuery"
const axiosBaseQuery = (
  { baseUrl }: { baseUrl: string } = { baseUrl: '' }
): BaseQueryFn<
  {
    url: string;
    method: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
  },
  unknown,
  unknown
> => async ({ url, method, data }) => {
  try {
    const result = await axios({ url: baseUrl + url, method, data });
    return { data: result.data };
  } catch (axiosError) {
    let err = axiosError as AxiosError;
    return { error: { status: err.response?.status, data: err.response?.data } };
  }
};

const api = createApi({
  baseQuery: axiosBaseQuery({
    baseUrl: 'http://example.com',
  }),
  endpoints(build) {
    return {
      query: build.query({ query: () => ({ url: '/query' }) }),
      mutation: build.mutation({ query: () => ({ url: '/mutation', method: 'post' }) }),
    };
  },
});
```

Ultimately, you can choose whatever library you prefer to use with your `baseQuery`, but it's important that you return the correct response format. If you haven't tried [`fetchBaseQuery`](../api/fetchBaseQuery) yet, give it a chance!

## Retrying on Error

RTK Query exports a utility called `retry` that you can wrap the `baseQuery` in your API definition with. It defaults to 5 attempts with a basic exponential backoff.

The default behavior would retry at these intervals:

1. 600ms + random time
2. 1200ms + random time
3. 2400ms + random time
4. 4800ms + random time
5. 9600ms + random time

```ts title="Retry every request 5 times by default"
// maxRetries: 5 is the default, and can be omitted. Shown for documentation purposes.
const staggeredBaseQuery = retry(fetchBaseQuery({ baseUrl: '/' }), { maxRetries: 5 });

export const api = createApi({
  baseQuery: staggeredBaseQuery,
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => ({ url: 'posts' }),
    }),
    getPost: build.query<PostsResponse, void>({
      query: (id: string) => ({ url: `posts/${id}` }),
      extraOptions: { maxRetries: 8 }, // You can override the retry behavior on each endpoint
    }),
  }),
});

export const { useGetPostsQuery, useGetPostQuery } = api;
```

In the event that you didn't want to retry on a specific endpoint, you can just set `maxRetries: 0`.

:::info
It is possible for a hook to return `data` and `error` at the same time. By default, RTK Query will keep whatever the last 'good' result was in `data` until it can be updated or garbage collected.
:::

## Bailing out of errors

`retry.fail`

```ts title="TODO"
baseBaseQuery.mockImplementation((input) => {
  retry.fail(error);
  return { data: `this won't happen` };
});

const baseQuery = retry(baseBaseQuery);
const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    q1: build.query({
      query: () => {},
    }),
  }),
});
```

## Handling errors at a macro level

There are quite a few ways that you can manage your errors, and in some cases, you may want to show a generic toast notification for any async error. Being that RTK Query is built on top of Redux and Redux-Toolkit, you can easily add a middleware to your store for this purpose.

:::tip
Redux-Toolkit released [matching utilities](https://redux-toolkit.js.org/api/matching-utilities#matching-utilities) in v1.5 that we can leverage for a lot of custom behaviors.
:::

```ts title="Error catching middleware"
import { MiddlewareAPI, isRejectedWithValue } from '@reduxjs/toolkit';
import { toast } from 'your-cool-library';
/**
 * Log a warning and show a toast!
 */
export const rtkQueryErrorLogger = (api: MiddlewareAPI) => (next) => (action) => {
  // RTK Query uses `createAsyncThunk` from redux-toolkit under the hood, so we're able to utilize these use matchers!
  if (isRejectedWithValue(action)) {
    console.warn('We got a rejected action!');
    toast.warn({ title: 'Async error!', message: action.error.data.message });
  }

  return next(action);
};
```
