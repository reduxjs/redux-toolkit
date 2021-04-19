---
id: code-splitting
title: Code Splitting
sidebar_label: Code Splitting
hide_title: true
---

# Code Splitting

RTK Query makes it possible to trim down your initial bundle size by allowing you to inject additional endpoints after you've setup your initial service definition. This can be very beneficial for larger applications that may have _many_ endpoints.

`injectEndpoints` accepts a collection of endpoints an one optional parameter of `overrideExisting`.

Calling `injectEndpoints` will inject the endpoints into the original API, but also give you that same API with correct types for these endpoints back. (Unfortunately, it cannot modify the types for the original crossing over files).

So the most basic approach would be to have one empty central api definition:

```ts title="Basic setup"
// Or from '@rtk-incubator/rtk-query/react'
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
});
```

and then inject the api endpoints in other files and export them from there - that way you will be sure to always import the endpoints in a way that they are definitely injected.

```ts title="Injecting & exporting additional endpoints"
const extendedApi = emptySplitApi.injectEndpoints({
  endpoints: (build) => ({
    example: build.query({
      query: () => 'test',
    }),
  }),
  overrideExisting: false,
});

export { useExampleQuery } = extendedApi;
```

:::tip
You will get a warning if you inject an endpoint that already exists in development mode when you don't explicitly specify `overrideExisting: true`. You **will not see this in production** and the existing endpoint will just be overriden, so make sure to account for this in your tests.
:::

## Typing a "completely injected" API using `ApiWithInjectedEndpoints`

However, doing this, you will never end up with one "big api definition" that has correct types for all endpoints. Under certain circumstances, that might be useful though. So you can use the `ApiWithInjectedEndpoints` to construct this "full api definition" yourself:

```ts title="Declaring an API using ApiWithInjectedEndpoints"
import { createApi, fetchBaseQuery, ApiWithInjectedEndpoints } from '@rtk-incubator/rtk-query';

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
});

// highlight-start
export const splitApi = emptySplitApi as ApiWithInjectedEndpoints<
  typeof emptySplitApi,
  [
    // These are only type imports, not runtime imports, meaning they're not included in the initial bundle
    typeof import('./posts').apiWithPosts,
    typeof import('./post').apiWithPost
  ]
>;
// highlight-end
```

Note however, that all endpoints added with `ApiWithInjectedEndpoints` are _optional_ on that definition, meaning that you have to check if they are `undefined` before using them.

A good strategy using this would be to do a check for `undefined` with an _asserting_ function, so you don't have your hooks in a conditional, which would violate the rules of hooks.

```tsx title="Using a type assertion"
function assert(condition: any, msg = 'Generic Assertion'): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

const Post = ({ id }: { id: number }) => {
  // highlight-start
  assert(
    splitApi.endpoints.getPost?.useQuery,
    'Endpoint `getPost` not loaded! Did you forget to import it in your current bundle?'
  );
  const { data, error } = splitApi.endpoints.getPost.useQuery(id);
  // highlight-end
  return error ? <>there was an error</> : !data ? <>loading</> : <h1>{data.name}</h1>;
};
```

## Example

<iframe
  src="https://codesandbox.io/embed/concepts-code-splitting-9cll0?fontsize=12&hidenavigation=1&theme=dark&module=%2Fsrc%2Ffeatures%2Fposts%2FPostsManager.tsx"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="Concepts Code Splitting"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
