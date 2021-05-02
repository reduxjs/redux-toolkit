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

- _tags_ - A string used to identify
- _providing tags_ - TODO:
- _invalidating tags_ - TODO:

  TODO: description of any other key concepts

## Cache tags

RTK Query uses the concept of 'tags' to determine whether a mutation for one endpoint intends to 'invalidate'

### Providing cache data

TODO: description/example of `providesTags`

### Invalidating cache data

TODO: description/example of `invalidatesTags`

## How cached data is handled

TODO:

## Recipes

### Providing errors to the cache

The information provided to the cache is not limited to successful data fetches. The concept can be used to inform RTK Query that a particular failure has been encountered, and provide that `tag` to the cache. A separate endpoint can then `invalidate` that tag, telling RTK Query to re-attempt the previously failed endpoints if a component is still subscribed to the failed query.

The example below demonstrates an example with the following behaviour:

- Provides an `UNAUTHORIZED` cache tag when a query fails with an error code of `401 UNAUTHORIZED`
- Provides an `UNKNOWN_ERROR` cache tag when a query fails with a different error
- Enables a 'login' mutation, which when _successful_, will `invalidate` the `UNAUTHORIZED` tag.  
  This will trigger the `postById` endpoint to re-fire if:
  1. The last call for `postById` had encountered an unauthorized error, and
  2. A component is still subscribed to this endpoint
- Enables a 'refetchErroredQueries' mutation which when _called_, will `invalidate` the `UNKNOWN_ERROR` tag.  
  This will trigger the `postById` endpoint to re-fire if:
  1. The last call for `postById` had encountered an unknown error, and
  2. A component is currently subscribed to this endpoint

```ts
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
