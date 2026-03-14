---
name: evolve-and-diagnose-redux-apps/debug-redux-toolkit-apps
description: >
  Use this when debugging duplicate requests, stale cache behavior, broad
  subscriptions, selector churn, serializability warnings, or other Redux
  Toolkit and RTK Query bugs. Covers a practical event -> reducer -> selector ->
  render debugging loop plus RTK Query cache interpretation.
type: lifecycle
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - build-modern-redux-apps/redux-dataflow
sources:
  - "reduxjs/redux:docs/style-guide/style-guide.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-5-async-logic.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-8-rtk-query-advanced.md"
  - "reduxjs/redux-toolkit:docs/usage/usage-guide.md"
---

# Debug Redux Toolkit Apps

## Setup

```ts
import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'

type Post = { id: string; title: string }

export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async () => {
    const response = await fetch('/api/posts')
    return (await response.json()) as Post[]
  },
  {
    condition(_arg, { getState }) {
      const state = getState() as RootState
      return state.posts.status === 'idle'
    },
  },
)

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [] as Post[],
    status: 'idle' as 'idle' | 'pending' | 'succeeded' | 'failed',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'pending'
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
  },
})

export const store = configureStore({
  reducer: {
    posts: postsSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>
```

## Core Patterns

### Debug in order: action -> reducer -> selector -> render

```ts
const selectPosts = (state: RootState) => state.posts.items
const selectPostsStatus = (state: RootState) => state.posts.status

store.dispatch(fetchPosts())

console.log(selectPostsStatus(store.getState()))
console.log(selectPosts(store.getState()))
```

If a component looks wrong, first verify the action fired, then the reducer state, then the selector result, then the render boundary.

### Narrow subscriptions at the usage site

```tsx
import { useAppSelector } from '../../app/hooks'

export function PostsList() {
  const posts = useAppSelector((state) => state.posts.items)
  const status = useAppSelector((state) => state.posts.status)

  return (
    <div>
      <div>{status}</div>
      <div>{posts.length}</div>
    </div>
  )
}
```

React-Redux behaves best when components select only the values they render and do it as close to usage as possible.

### Interpret RTK Query invalidation correctly

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Post = { id: string; title: string }

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: ['Post'],
    }),
    updatePost: build.mutation<Post, Pick<Post, 'id' | 'title'>>({
      query: ({ id, title }) => ({
        url: `posts/${id}`,
        method: 'PATCH',
        body: { title },
      }),
      invalidatesTags: ['Post'],
    }),
  }),
})
```

If invalidation did not visibly refetch, check whether anything was still subscribed to that cache entry.

## Common Mistakes

### HIGH Dispatching fetch thunks from effects without a thunk-level guard

Wrong:

```tsx
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'

function PostsPage() {
  const dispatch = useAppDispatch()
  const postStatus = useAppSelector((state) => state.posts.status)

  useEffect(() => {
    if (postStatus === 'idle') {
      dispatch(fetchPosts())
    }
  }, [dispatch, postStatus])

  return null
}
```

Correct:

```ts
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async () => {
    const response = await fetch('/api/posts')
    return (await response.json()) as Post[]
  },
  {
    condition(_arg, { getState }) {
      const state = getState() as RootState
      return state.posts.status === 'idle'
    },
  },
)
```

React StrictMode can run effects twice in development, so the guard belongs in the thunk as well as the component.

Source: reduxjs/redux:docs/tutorials/essentials/part-5-async-logic.md

### HIGH Ignoring serializable-state warnings

Wrong:

```ts
const initialState = {
  lastSeen: new Date(),
  pendingIds: new Set<string>(),
}
```

Correct:

```ts
const initialState = {
  lastSeenIso: new Date().toISOString(),
  pendingIds: [] as string[],
}
```

Non-serializable values break DevTools, replay, persistence, and equality assumptions in subtle ways.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Selecting broad state in parents and threading props

Wrong:

```tsx
import { useAppSelector } from '../../app/hooks'

function PostsPage() {
  const postsState = useAppSelector((state) => state.posts)
  return <PostsList items={postsState.items} status={postsState.status} />
}
```

Correct:

```tsx
import { useAppSelector } from '../../app/hooks'

function PostsList() {
  const items = useAppSelector((state) => state.posts.items)
  const status = useAppSelector((state) => state.posts.status)
  return (
    <div>
      <div>{status}</div>
      <div>{items.length}</div>
    </div>
  )
}
```

Selecting whole slices high in the tree widens the subscription surface and pushes rerenders through props.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### MEDIUM Returning unstable objects from query selection logic

Wrong:

```tsx
import { api } from '../../services/api'

const result = api.useGetPostsQuery(undefined, {
  selectFromResult: ({ data = [] }) => ({
    posts: [...data],
  }),
})
```

Correct:

```tsx
import { api } from '../../services/api'

const result = api.useGetPostsQuery(undefined, {
  selectFromResult: ({ data = [] }) => ({
    posts: data,
  }),
})
```

New object and array references defeat memoization and make components rerender even when the underlying cached data did not change.

Source: reduxjs/redux:docs/tutorials/essentials/part-8-rtk-query-advanced.md
