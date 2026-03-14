---
name: build-modern-redux-apps/redux-dataflow
description: >
  Use this when you need the Redux event -> reducer -> selector -> render loop,
  event-style actions, reducer-owned state transitions, derived data, or a
  debugging model for Redux Toolkit apps.
type: core
library: "@reduxjs/toolkit"
library_version: "2.11.2"
sources:
  - "reduxjs/redux:docs/tutorials/fundamentals/part-2-concepts-data-flow.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-3-data-flow.md"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
---

# Redux Dataflow

## Setup

```ts
import { configureStore, createSelector, createSlice } from '@reduxjs/toolkit'

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [] as { id: string; title: string; published: boolean }[],
    filter: 'all' as 'all' | 'published',
  },
  reducers: {
    postAdded(state, action: { payload: { id: string; title: string } }) {
      state.items.push({ ...action.payload, published: false })
    },
    postPublished(state, action: { payload: { id: string } }) {
      const post = state.items.find((item) => item.id === action.payload.id)
      if (post) {
        post.published = true
      }
    },
    filterChanged(state, action: { payload: 'all' | 'published' }) {
      state.filter = action.payload
    },
  },
})

const store = configureStore({
  reducer: {
    posts: postsSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>

const selectPostsState = (state: RootState) => state.posts
const selectVisiblePosts = createSelector([selectPostsState], (postsState) =>
  postsState.filter === 'all'
    ? postsState.items
    : postsState.items.filter((post) => post.published),
)

store.dispatch(postsSlice.actions.postAdded({ id: 'p1', title: 'Draft' }))
store.dispatch(postsSlice.actions.postPublished({ id: 'p1' }))

const visiblePosts = selectVisiblePosts(store.getState())
console.log(visiblePosts)
```

## Core Patterns

### Dispatch events, not setters

```ts
const postsSlice = createSlice({
  name: 'posts',
  initialState: [] as { id: string; title: string }[],
  reducers: {
    postAdded(state, action: { payload: { id: string; title: string } }) {
      state.push(action.payload)
    },
    postRemoved(state, action: { payload: { id: string } }) {
      return state.filter((post) => post.id !== action.payload.id)
    },
    postUpdated(
      state,
      action: { payload: { id: string; changes: Partial<{ title: string }> } },
    ) {
      const post = state.find((item) => item.id === action.payload.id)
      if (post && action.payload.changes.title) {
        post.title = action.payload.changes.title
      }
    },
  },
})

postsSlice.actions.postAdded({ id: 'p1', title: 'Draft' })
```

Event-style actions explain what happened in the UI instead of hiding the transition behind a generic setter.

### Let reducers combine old store data with new outside data

```ts
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit'

const postsAdapter = createEntityAdapter<{ id: string; title: string }>()

const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState(),
  reducers: {
    postsReceived(state, action: { payload: { id: string; title: string }[] }) {
      postsAdapter.upsertMany(state, action.payload)
    },
  },
})

const incomingPosts = [
  { id: 'p1', title: 'Draft' },
  { id: 'p2', title: 'Published' },
]

postsSlice.actions.postsReceived(incomingPosts)
```

If a transition mixes current store state with new external data, dispatch the new external data and let the reducer own the merge.

### Derive values with selectors instead of storing duplicates

```ts
import { createSelector } from '@reduxjs/toolkit'

const selectPosts = (state: RootState) => state.posts.items
const selectFilter = (state: RootState) => state.posts.filter

export const selectVisiblePosts = createSelector(
  [selectPosts, selectFilter],
  (posts, filter) =>
    filter === 'all'
      ? posts
      : posts.filter((post) => post.published),
)
```

Selectors keep a single source of truth in state while still exposing the shapes the UI needs.

## Common Mistakes

### CRITICAL Mutating selected state outside reducers

Wrong:

```ts
const post = selectPostById(store.getState(), 'p1')

if (post) {
  post.title = 'Changed in place'
}
```

Correct:

```ts
store.dispatch(postUpdated({ id: 'p1', changes: { title: 'Changed in place' } }))
```

Objects read from the store are still store state; mutating them outside reducers breaks immutability and stale-render assumptions.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Using setter-style actions instead of event-style actions

Wrong:

```ts
const nextPosts = [...selectPosts(store.getState()), { id: 'p2', title: 'Write docs' }]
store.dispatch(setPosts(nextPosts))
```

Correct:

```ts
store.dispatch(postAdded({ id: 'p2', title: 'Write docs' }))
```

Actions should describe events, not ask reducers to blindly replace state with a precomputed value.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Combining store state before dispatch

Wrong:

```ts
const currentPosts = selectPosts(store.getState())
const mergedPosts = [
  ...currentPosts.filter(
    (currentPost) =>
      !incomingPosts.some((incomingPost) => incomingPost.id === currentPost.id),
  ),
  ...incomingPosts,
]

store.dispatch(postsReplaced(mergedPosts))
```

Correct:

```ts
store.dispatch(postsReceived(incomingPosts))
```

If the next state depends on current store state, the reducer should own that combination logic; only authoritative external snapshots should replace state wholesale.

Source: maintainer interview

### HIGH Ignoring current state in async reducers

Wrong:

```ts
builder.addCase(fetchPosts.fulfilled, (state, action) => {
  state.status = 'succeeded'
  state.items = action.payload
})
```

Correct:

```ts
builder.addCase(fetchPosts.fulfilled, (state, action) => {
  if (state.status === 'pending') {
    state.status = 'succeeded'
    state.items = action.payload
  }
})
```

Reducers that treat every lifecycle action as valid can move the slice into impossible states or let stale requests win.

Source: reduxjs/redux:docs/tutorials/essentials/part-5-async-logic.md

### MEDIUM Storing derived values in state

Wrong:

```ts
const initialState = {
  items: [] as Post[],
  visiblePosts: [] as Post[],
}
```

Correct:

```ts
const selectVisiblePosts = createSelector(
  [selectPosts, selectFilter],
  (posts, filter) =>
    filter === 'all' ? posts : posts.filter((post) => post.published),
)
```

Derived values drift out of sync quickly; keep the raw state and derive the view shape.

Source: reduxjs/redux:docs/style-guide/style-guide.md
