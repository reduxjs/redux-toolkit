---
name: manage-server-data/adopt-rtk-query
description: >
  Use this when adding RTK Query as the default server-data and document-cache
  layer. Covers createApi, store integration, hooks, invalidation behavior,
  optimistic updates, and deciding when RTK Query is the right cache model.
type: lifecycle
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - build-modern-redux-apps/modern-redux
sources:
  - "reduxjs/redux-toolkit:docs/rtk-query/api/createApi.mdx"
  - "reduxjs/redux-toolkit:docs/rtk-query/usage/automated-refetching.mdx"
  - "reduxjs/redux-toolkit:docs/rtk-query/usage/manual-cache-updates.mdx"
  - "reduxjs/redux-toolkit:docs/rtk-query/usage/persistence-and-rehydration.mdx"
  - "reduxjs/redux-toolkit:docs/tutorials/rtk-query.mdx"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
---

# Adopt RTK Query

## Setup

```tsx
// file: src/services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Post = { id: string; title: string }

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post' as const, id })), 'Post']
          : ['Post'],
    }),
    addPost: build.mutation<Post, Pick<Post, 'title'>>({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Post'],
    }),
  }),
})

export const { useGetPostsQuery, useAddPostMutation } = api

// file: src/app/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { api } from '../services/api'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

// file: src/App.tsx
import { Provider } from 'react-redux'
import { store } from './app/store'
import { useAddPostMutation, useGetPostsQuery } from './services/api'

function Posts() {
  const { data: posts = [] } = useGetPostsQuery()
  const [addPost] = useAddPostMutation()

  return (
    <div>
      <button onClick={() => addPost({ title: 'Write docs' })}>Add</button>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}

export function App() {
  return (
    <Provider store={store}>
      <Posts />
    </Provider>
  )
}
```

## Core Patterns

### Keep one API slice per base URL and extend it

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
})

export const postsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPosts: build.query<{ id: string; title: string }[], void>({
      query: () => 'posts',
    }),
  }),
})
```

Split files with `injectEndpoints`, not by making multiple `createApi` roots for the same backend.

### Use tags for cache invalidation

```ts
type Post = { id: string; title: string }

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Post' as const, id })), 'Post']
          : ['Post'],
    }),
    updatePost: build.mutation<Post, Pick<Post, 'id' | 'title'>>({
      query: ({ id, title }) => ({
        url: `posts/${id}`,
        method: 'PATCH',
        body: { title },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Post', id }],
    }),
  }),
})
```

Treat tags as the normal invalidation path before reaching for manual cache patching.

### Do optimistic updates in endpoint lifecycles

```ts
type Post = { id: string; title: string }

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: ['Post'],
    }),
    updatePostTitle: build.mutation<Post, Pick<Post, 'id' | 'title'>>({
      query: ({ id, title }) => ({
        url: `posts/${id}`,
        method: 'PATCH',
        body: { title },
      }),
      async onQueryStarted({ id, title }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('getPosts', undefined, (draft) => {
            const post = draft.find((item) => item.id === id)
            if (post) {
              post.title = title
            }
          }),
        )

        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
    }),
  }),
})
```

Keep optimistic and pessimistic cache updates inside endpoint lifecycle handlers so they stay coupled to the request.

## Common Mistakes

### CRITICAL Creating multiple API slices for one backend

Wrong:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type User = { id: string; name: string }

const baseQuery = fetchBaseQuery({ baseUrl: '/api/' })

const postsApi = createApi({
  reducerPath: 'api',
  baseQuery,
  endpoints: () => ({}),
})

const usersApi = createApi({
  reducerPath: 'api',
  baseQuery,
  endpoints: () => ({}),
})
```

Correct:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type User = { id: string; name: string }

const baseQuery = fetchBaseQuery({ baseUrl: '/api/' })

const api = createApi({
  reducerPath: 'api',
  baseQuery,
  endpoints: () => ({}),
})

const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<User[], void>({ query: () => 'users' }),
  }),
})
```

One API slice per base URL preserves invalidation behavior and avoids duplicated middleware work.

Source: reduxjs/redux-toolkit:docs/rtk-query/api/createApi.mdx

### HIGH Forgetting `api.reducer` or `api.middleware`

Wrong:

```ts
import { configureStore } from '@reduxjs/toolkit'

const store = configureStore({
  reducer: {},
})
```

Correct:

```ts
import { configureStore } from '@reduxjs/toolkit'

const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})
```

RTK Query hooks need both the reducer and middleware to manage cache state and request lifecycles.

Source: reduxjs/redux-toolkit:docs/tutorials/rtk-query.mdx

### MEDIUM Persisting browser API cache by default

Wrong:

```ts
const storage = window.localStorage

const persistConfig = {
  key: 'root',
  storage,
}
```

Correct:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
})
```

Persisting RTK Query cache in browsers often keeps stale data around longer than users expect; treat persistence as a special case, not the default.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/persistence-and-rehydration.mdx

### HIGH Patching cache from components

Wrong:

```tsx
import { useEffect } from 'react'
import { useAppDispatch } from '../../app/hooks'

const dispatch = useAppDispatch()

useEffect(() => {
  dispatch(api.util.updateQueryData('getPosts', undefined, (draft) => {
    draft.push({ id: 'p3', title: 'Patched from component' })
  }))
}, [dispatch])
```

Correct:

```ts
updatePostTitle: build.mutation<Post, Pick<Post, 'id' | 'title'>>({
  query: ({ id, title }) => ({
    url: `posts/${id}`,
    method: 'PATCH',
    body: { title },
  }),
  async onQueryStarted({ id, title }, { dispatch, queryFulfilled }) {
    const patch = dispatch(
      api.util.updateQueryData('getPosts', undefined, (draft) => {
        const post = draft.find((item) => item.id === id)
        if (post) {
          post.title = title
        }
      }),
    )

    try {
      await queryFulfilled
    } catch {
      patch.undo()
    }
  },
})
```

Component-level cache patches drift away from the mutation lifecycle that should own them.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/manual-cache-updates.mdx

### HIGH Expecting invalidation to refetch unsubscribed queries

Wrong:

```ts
import { api } from './api'
import { store } from './store'

const subscription = store.dispatch(api.endpoints.getPosts.initiate())
subscription.unsubscribe()
store.dispatch(api.util.invalidateTags(['Post']))
```

Correct:

```ts
import { api } from './api'
import { store } from './store'

store.dispatch(api.endpoints.getPosts.initiate())
store.dispatch(api.util.invalidateTags(['Post']))
```

Invalidation only refetches actively subscribed queries; if no component is using that cache entry, RTK Query drops it and fetches again next time it is needed.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/automated-refetching.mdx

## References

- [Endpoint lifecycle details and cache tradeoffs](references/endpoint-lifecycle.md)
