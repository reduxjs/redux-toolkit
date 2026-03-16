---
name: model-redux-state/design-state-ownership
description: >
  Use this when deciding whether data belongs in Redux, component state, router
  state, or another external source. Covers state ownership, authority
  boundaries, slice sizing, and when to move or split data as the app evolves.
type: core
library: "@reduxjs/toolkit"
library_version: "2.11.2"
sources:
  - "reduxjs/redux:docs/style-guide/style-guide.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-2-app-structure.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-4-using-data.md"
---

# Design State Ownership

## Setup

```tsx
import { useState } from 'react'
import { createSlice } from '@reduxjs/toolkit'
import { useAppDispatch } from '../../app/hooks'

const postsSlice = createSlice({
  name: 'posts',
  initialState: [] as { id: string; title: string; content: string }[],
  reducers: {
    postAdded(
      state,
      action: { payload: { id: string; title: string; content: string } },
    ) {
      state.push(action.payload)
    },
  },
})

const { postAdded } = postsSlice.actions

export function AddPostForm() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const dispatch = useAppDispatch()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        dispatch(postAdded({ id: 'p1', title, content }))
      }}
    >
      <input value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  )
}
```

## Core Patterns

### Keep editable form state local until the user commits it

```tsx
import { useState } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { profileSaved } from './profileSlice'

export function ProfileForm() {
  const [displayName, setDisplayName] = useState('Lenz')
  const dispatch = useAppDispatch()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        dispatch(profileSaved({ displayName }))
      }}
    >
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  )
}
```

Prefer Redux for shared, durable app state, not every keystroke.

### Keep URL state with the router and combine it at the edge

```tsx
import { createSelector } from '@reduxjs/toolkit'
import { useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'

type RootState = {
  posts: {
    items: { id: string; title: string; published: boolean }[]
  }
}

const selectPosts = (state: RootState) => state.posts.items

const selectVisiblePosts = createSelector(
  [selectPosts, (_state: RootState, filter: string) => filter],
  (posts, filter) =>
    filter === 'published'
      ? posts.filter((post) => post.published)
      : posts,
)

export function PostsList() {
  const [searchParams] = useSearchParams()
  const filter = searchParams.get('filter') ?? 'all'
  const posts = useAppSelector((state) => selectVisiblePosts(state, filter))

  return <div>{posts.length}</div>
}
```

If the router already owns a piece of state, pass it into selectors or combine it in the component instead of syncing it into Redux.

### Re-size slices when access patterns change

```ts
import { combineReducers, createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: { userId: null as string | null },
  reducers: {},
})

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [] as { id: string; title: string }[] },
  reducers: {},
})

export const rootReducer = combineReducers({
  auth: authSlice.reducer,
  posts: postsSlice.reducer,
})
```

Revisit slice size over time; unrelated data should split apart, and data constantly stitched together in every component may belong closer together.

## Common Mistakes

### MEDIUM Putting form editing state in Redux

Wrong:

```tsx
import { useAppSelector } from '../../app/hooks'

const selectDraftTitle = (state: { draft: { title: string } }) => state.draft.title

const title = useAppSelector(selectDraftTitle)
```

Correct:

```tsx
const [title, setTitle] = useState('')

<input value={title} onChange={(event) => setTitle(event.target.value)} />
```

Per-keystroke dispatching adds global complexity for data that usually lives in one component tree.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Synchronizing router or URL state into Redux

Wrong:

```tsx
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'

function PostsPage() {
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()

useEffect(() => {
  dispatch(filterChanged(searchParams.get('filter') ?? 'all'))
}, [dispatch, searchParams])

  return null
}
```

Correct:

```tsx
const filter = searchParams.get('filter') ?? 'all'
const posts = useAppSelector((state) => selectVisiblePosts(state, filter))
```

URL state already has an authoritative owner; duplicating it into Redux creates two sources of truth.

Source: maintainer interview

### HIGH Naming state after components

Wrong:

```ts
import { combineReducers } from '@reduxjs/toolkit'

const loginReducer = (state = { open: false }) => state
const postsReducer = (state = [] as { id: string; title: string }[]) => state

const rootReducer = combineReducers({
  loginScreen: loginReducer,
  postsList: postsReducer,
})
```

Correct:

```ts
import { combineReducers } from '@reduxjs/toolkit'

const authReducer = (state = { userId: null as string | null }) => state
const postsReducer = (state = [] as { id: string; title: string }[]) => state

const rootReducer = combineReducers({
  auth: authReducer,
  posts: postsReducer,
})
```

Store keys should describe data or domain concepts, not the current component tree.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### MEDIUM Letting slice boundaries fossilize

Wrong:

```ts
import { createSlice } from '@reduxjs/toolkit'

type Post = { id: string; title: string }
type AppNotification = { id: string; message: string }

const appSlice = createSlice({
  name: 'app',
  initialState: {
    auth: { userId: null as string | null },
    posts: [] as Post[],
    notifications: [] as AppNotification[],
  },
  reducers: {},
})
```

Correct:

```ts
import { createSlice } from '@reduxjs/toolkit'

type Post = { id: string; title: string }

const authSlice = createSlice({
  name: 'auth',
  initialState: { userId: null as string | null },
  reducers: {},
})

const postsSlice = createSlice({
  name: 'posts',
  initialState: [] as Post[],
  reducers: {},
})
```

When unrelated data is welded together, every change point gets noisier; split or merge slices as actual access patterns demand.

Source: maintainer interview

### HIGH Blindly spreading payloads into state

Wrong:

```ts
const state = { id: '1', name: 'Lenz' }
const action = { payload: { id: '2', name: 'Mark', ignored: true } }

userLoggedIn(state, action) {
  return { ...state, ...action.payload }
}
```

Correct:

```ts
const state = { id: '1', name: 'Lenz' }
const action = { payload: { id: '2', name: 'Mark', ignored: true } }

userLoggedIn(state, action) {
  state.id = action.payload.id
  state.name = action.payload.name
}
```

Reducers should own the slice shape instead of treating payloads as trusted state patches.

Source: reduxjs/redux:docs/style-guide/style-guide.md

## References

- [State ownership heuristics](references/state-ownership.md)
