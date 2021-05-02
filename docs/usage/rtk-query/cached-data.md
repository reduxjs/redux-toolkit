---
id: cached-data
title: Cached Data
sidebar_label: Cached Data
hide_title: true
---

# Cached Data

A key feature of RTK Query is it's management of cached data. When data is fetched from the server, RTK Query will store the data in the redux store as a 'cache'. When an additional request is performed for the same data, RTK Query will provide the cached data rather than sending an additional request to the server.

RTK Query provides a number of concepts and tools to manipulate the cache behaviour and adjust it to your needs.

## Definitions

- _tags_ - Items used to identify the data present in the cache. An individual `tag` has a `type`, represented as a `string` name, and an optional `id`, represented as a `string` or `number`.
- _providing tags_ - Used to advise which tags are provided by an individual query endpoint, and can be considered 'valid' in the cache
- _invalidating tags_ - Identifies which tags are invalidated by an individual mutation endpoint, and should no longer be considered 'valid' in the cache

  TODO: description of any other key concepts

## Default cache handling behaviour

TODO:

## Cache tags

RTK Query uses the concept of 'tags' to determine whether a mutation for one endpoint intends to 'invalidate' some data that was 'provided' by a query from another endpoint. When defining an `api`, `createApi` accepts an array of tag type names for the `tagTypes` property, which is a list of possible tag name options that the queries for the `api` could provide.

The example below declares that endpoints can possibly provide 'Posts' and/or 'Users' to the cache:

```js title="Example of declaring cache tags"
const api = createApi({
  baseQuery,
  // highlight-start
  tagTypes: ['Posts', 'Users'],
  // highlight-end
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => '/posts',
    }),
    getUsers: build.query({
      query: () => '/users',
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
    }),
    editPost: build.mutation({
      query: (body) => ({
        url: `posts/${body.id}`,
        method: 'POST',
        body,
      }),
    }),
  }),
})
```

By declaring these tags as what can possibly be provided to the cache, it enables control for individual endpoints to claim whether they affect specific portions of the cache or not, in conjunction with `providesTags` and `invalidatesTags` on individual endpoints.

### Providing cache data

Each individual `query` endpoint can `provide` particular tags to the cache. Doing so enables a relationship between cached data from one or more `query` endpoints and the behaviour of one or more `mutation` endpoints.

The `providesTags` property on a `query` endpoint is used for this purpose.

The example below declares that the `getPosts` `query` endpoint `provides` the `'Post'` tag to the cache, using the `providesTags` property for a `query` endpoint.

```js title="Example of providing tags to the cache"
const api = createApi({
  baseQuery,
  tagTypes: ['Post', 'User'],
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => '/posts',
      // highlight-start
      providesTags: ['Post'],
      // highlight-end
    }),
    getUsers: build.query({
      query: () => '/users',
      // highlight-start
      providesTags: ['User'],
      // highlight-end
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
    }),
    editPost: build.mutation({
      query: (body) => ({
        url: `posts/${body.id}`,
        method: 'POST',
        body,
      }),
    }),
  }),
})
```

For more granular control over the provided data, provided `tags` can have an associated `id`. This enables a distinction between 'any of a particular tag type', and 'a specific instance of a particular tag type'.

The example below declares that the provided posts are associated with particular IDs as determined by the result returned by the endpoint:

```js title="Example of providing tags with IDs to the cache"
const api = createApi({
  baseQuery,
  tagTypes: ['Post', 'User'],
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => '/posts',
      // highlight-start
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post', id })), 'Post']
          : ['Post'],
      // highlight-end
    }),
    getUsers: build.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
    }),
    editPost: build.mutation({
      query: (body) => ({
        url: `posts/${body.id}`,
        method: 'POST',
        body,
      }),
    }),
  }),
})
```

Note that for the example above, the `id` is used where possible on a successful result. In the case of an error, no result is supplied, and we still consider that it has provided the general `'Post'` tag type rather than any specific instance of that tag.

### Invalidating cache data

Each individual `mutation` endpoint can `invalidate` particular tags in the cache. Doing so enables a relationship between cached data from one or more `query` endpoints and the behaviour of one or more `mutation` endpoints.

The `invalidatesTags` property on a `mutation` endpoint is used for this purpose.

The example below declares that the `addPost` and `editPost` `mutation` endpoints `invalidate` the `'Post'` tag in the cache, using the `invalidatesTags` property for a `mutation` endpoint:

```js title="Example of invalidating tags in the cache"
const api = createApi({
  baseQuery,
  tagTypes: ['Post', 'User'],
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => '/posts',
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post', id })), 'Post']
          : ['Post'],
    }),
    getUsers: build.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
      // highlight-start
      invalidatesTags: ['Post'],
      // highlight-end
    }),
    editPost: build.mutation({
      query: (body) => ({
        url: `posts/${body.id}`,
        method: 'POST',
        body,
      }),
      // highlight-start
      invalidatesTags: ['Post'],
      // highlight-end
    }),
  }),
})
```

For the example above, this tells RTK Query that after the `addPost` and/or `editPost` mutations are called and completed, any cache data supplied with the `'Post'` tag is no longer valid. If a component is currently subscribed to the cached data for a `'Post'` tag when the above mutations are called, it will automatically re-fetch in order to retrieve up to date data from the server.

An example scenario would be like so:

1. A component is rendered which is using the `useGetPostsQuery()` hook to subscribe to that endpoint's cached data
2. The `/posts` request is fired off, and server responds with posts with IDs 1, 2 & 3.
3. The `getPosts` endpoint stores the received data in the cache, and internally registers that the following tags have been provided:
   <!-- prettier-ignore -->
   ```js
   [
     { type: 'Post', id: 1 },
     { type: 'Post', id: 2 },
     { type: 'Post', id: 3 },
   ]
   ```
4. The `editPost` mutation is fired off to alter a particular post
5. Upon completion, RTK Query internally registers that the `'Post'` tag is now invalidated, and removes the previously provided `'Post'` tags from the cache
6. Since the `getPosts` endpoint has provided tags of type `'Post'` which now has invalid cache data, and the component is still subscribed to the data, the `/posts` request is automatically fired off again, fetching new data and adding the new tags to the cache

For more granular control over the invalidated data, invalidated `tags` can have an associated `id` in the same manner as `providesTags`. This enables a distinction between 'any of a particular tag type' and 'a specific instance of a particular tag type'.

The example below declares that the `editPost` mutation provides a specific instance of a `Post` tag, using the id provided when calling the mutation function:

```js title="Example of invalidating tags with IDs to the cache"
const api = createApi({
  baseQuery,
  tagTypes: ['Post', 'User'],
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => '/posts',
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post', id })), 'Post']
          : ['Post'],
    }),
    getUsers: build.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Post'],
    }),
    editPost: build.mutation({
      query: (body) => ({
        url: `posts/${body.id}`,
        method: 'POST',
        body,
      }),
      // highlight-start
      invalidatesTags: (result, error, arg) => [{ type: 'Post', id: arg.id }],
      // highlight-end
    }),
  }),
})
```

For the example above, rather than invalidating any tag with the type `'Post'`, calling the `editPost` mutation function will now only invalidate a tag for the provided `id`. I.e. if an endpoint does not provide a `'Post'` for that same `id`, it will remain considered as 'valid', and will not be triggered to automatically re-fetch.

:::tip Using abstract tag IDs
In order to provide stronger control over invalidating the appropriate data, you can use an arbitrary ID such a `'LIST'` for a given tag. See [Using abstract tag IDs](#using-abstract-tag-ids) for additional details.
:::

#### Invalidation behaviour

The matrix below shows examples of which invalidated tags will affect and invalidate which provided tags:

<table>
  <thead>
    <tr>
      <th class="diagonal-cell">
        <div class="diagonal-cell--content">
          <div class="diagonal-cell--topRight">Provided</div>
          <div class="diagonal-cell--bottomLeft">Invalidated</div>
        </div>
      </th>
      <th>
        <div>General tag A</div>
        <div style={{ fontWeight: 'normal' }} >
          {"['Post']"}<br />{"/"}<br />{"[{ type: 'Post' }]"}
        </div>
      </th>
      <th>
        <div>General tag B</div>
        <div style={{ fontWeight: 'normal' }}>
          {"['User']"}<br />{"/"}<br />{"[{ type: 'User' }]"}
        </div>
      </th>
      <th>
        <div>Specific tag A1</div>
        <div style={{ fontWeight: 'normal' }}>
          {"[{ type: 'Post', id: 1 }]"}
        </div>
      </th>
      <th>
        <div>Specific tag A2</div>
        <div style={{ fontWeight: 'normal' }}>
          {"[{ type: 'Post', id: 2 }]"}
        </div>
      </th>
      <th>
        <div>Specific tag B1</div>
        <div style={{ fontWeight: 'normal' }}>
          {"[{ type: 'User', id: 1 }]"}
        </div>
      </th>
      <th>
        <div>Specific tag B2</div>
        <div style={{ fontWeight: 'normal' }}>
          {"[{ type: 'User', id: 2 }]"}
        </div>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>General tag A</div>
        <div>{"['Post'] / [{ type: 'Post' }]"}</div>
      </td>
      <td>✔️</td>
      <td></td>
      <td>✔️</td>
      <td>✔️</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>General tag B</div>
        <div>{"['User'] /"}<br />{"[{ type: 'User' }]"}</div>
      </td>
      <td></td>
      <td>✔️</td>
      <td></td>
      <td></td>
      <td>✔️</td>
      <td>✔️</td>
    </tr>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>Specific tag A1</div>
        <div>{"[{ type: 'Post', id: 1 }]"}</div>
      </td>
      <td>✔️</td>
      <td></td>
      <td>✔️</td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>Specific tag A2</div>
        <div>{"[{ type: 'Post', id: 2 }]"}</div>
      </td>
      <td>✔️</td>
      <td></td>
      <td></td>
      <td>✔️</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>Specific tag B1</div>
        <div>{"[{ type: 'User', id: 1 }]"}</div>
      </td>
      <td></td>
      <td>✔️</td>
      <td></td>
      <td></td>
      <td>✔️</td>
      <td></td>
    </tr>
    <tr>
      <td>
        <div style={{ fontWeight: 'bold' }}>Specific tag B2</div>
        <div>{"[{ type: 'User', id: 2 }]"}</div>
      </td>
      <td></td>
      <td>✔️</td>
      <td></td>
      <td></td>
      <td></td>
      <td>✔️</td>
    </tr>
  </tbody>
</table>

The invalidation behaviour can be summarized like so:

**General tag**

e.g. `['Post'] / [{ type: 'Post' }]`

Will `invalidate` any `provided` tag with the matching type, including general and specific tags.

Example:  
If a general tag of `Post` was invalidated, the following `provided` tags would all be invalidated:

- `['Post']`
- `[{ type: 'Post' }]`
- `[{ type: 'Post' }, { type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }, { type: 'User' }]`
- `[{ type: 'Post', id: 'LIST' }]`
- `[{ type: 'Post', id: 1 }, { type: 'Post', id: 'LIST' }]`

The following `provided` tags would _not_ be invalidated:

- `['User']`
- `[{ type: 'User' }]`
- `[{ type: 'User', id: 1 }]`
- `[{ type: 'User', id: 'LIST' }]`
- `[{ type: 'User', id: 1 }, { type: 'User', id: 'LIST' }]`

**Specific tag**

e.g. `[{ type: 'Post', id: 1 }]`

Will `invalidate` any `provided` tag with both the matching type, _and_ matching id. Will not invalidate a `general` tag, but _might_ invalidate data for an endpoint that provides a `general` tag _if_ it also provides a matching `specific` tag.

Example 1:
If a specific tag of `{ type: 'Post', id: 1 }` was invalidated, the following `provided` tags would all be invalidated:

- `[{ type: 'Post' }, { type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }, { type: 'User' }]`
- `[{ type: 'Post', id: 1 }, { type: 'Post', id: 'LIST' }]`

The following `provided` tags would _not_ be invalidated:

- `['Post']`
- `[{ type: 'Post' }]`
- `[{ type: 'Post', id: 'LIST' }]`
- `['User']`
- `[{ type: 'User' }]`
- `[{ type: 'User', id: 1 }]`
- `[{ type: 'User', id: 'LIST' }]`
- `[{ type: 'User', id: 1 }, { type: 'User', id: 'LIST' }]`

Example 2:
If a specific tag of `{ type: 'Post', id: 'LIST' }` was invalidated, the following `provided` tags would all be invalidated:

- `[{ type: 'Post', id: 'LIST' }]`
- `[{ type: 'Post', id: 1 }, { type: 'Post', id: 'LIST' }]`

The following `provided` tags would _not_ be invalidated:

- `['Post']`
- `[{ type: 'Post' }]`
- `[{ type: 'Post' }, { type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }]`
- `[{ type: 'Post', id: 1 }, { type: 'User' }]`
- `['User']`
- `[{ type: 'User' }]`
- `[{ type: 'User', id: 1 }]`
- `[{ type: 'User', id: 'LIST' }]`
- `[{ type: 'User', id: 1 }, { type: 'User', id: 'LIST' }]`

## Recipes

### Using abstract tag IDs

TODO: discuss the usage of a 'LIST' id

### Providing errors to the cache

The information provided to the cache is not limited to successful data fetches. The concept can be used to inform RTK Query that a particular failure has been encountered, and provide that `tag` to the cache. A separate endpoint can then `invalidate` that tag, telling RTK Query to re-attempt the previously failed endpoints if a component is still subscribed to the failed data.

The example below demonstrates an example with the following behaviour:

- Provides an `UNAUTHORIZED` cache tag when a query fails with an error code of `401 UNAUTHORIZED`
- Provides an `UNKNOWN_ERROR` cache tag when a query fails with a different error
- Enables a 'login' mutation, which when _successful_, will `invalidate` the `UNAUTHORIZED` tag.  
  This will trigger the `postById` endpoint to re-fire if:
  1. The last call for `postById` had encountered an unauthorized error, and
  2. A component is still subscribed to the cached data
- Enables a 'refetchErroredQueries' mutation which when _called_, will `invalidate` the `UNKNOWN_ERROR` tag.  
  This will trigger the `postById` endpoint to re-fire if:
  1. The last call for `postById` had encountered an unknown error, and
  2. A component is currently subscribed to the cached data

```js
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com' }),
  tagTypes: ['Post', 'UNAUTHORIZED', 'UNKNOWN_ERROR'],
  endpoints: (build) => ({
    postById: build.query({
      query: (id) => `post/${id}`,
      providesTags: (result, error, id) =>
        result
          ? [{ type: 'Post', id }]
          : error?.status === 401
          ? ['UNAUTHORIZED']
          : ['UNKNOWN_ERROR'],
    }),
    login: build.mutation({
      query: () => '/login',
      // on successful login, will refetch all currently
      // 'UNAUTHORIZED' queries
      invalidatesTags: (result) => (result ? ['UNAUTHORIZED'] : []),
    }),
    refetchErroredQueries: build.mutation({
      queryFn: () => ({ data: {} }),
      invalidates: ['UNKNOWN_ERROR'],
    }),
  }),
})
```

### Abstracting common provides/invalidates usage

TODO: description/example of `providesTags`/`invalidatesTags` abstractions to reduce boilerplate
