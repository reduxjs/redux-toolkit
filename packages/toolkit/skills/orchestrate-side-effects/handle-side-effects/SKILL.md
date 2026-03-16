---
name: orchestrate-side-effects/handle-side-effects
description: >
  Use this when choosing between RTK Query, createAsyncThunk, handwritten
  thunks, and createListenerMiddleware. Covers imperative versus reactive
  workflows, listener middleware setup, and keeping side effects out of
  reducers and UI components.
type: core
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - build-modern-redux-apps/redux-dataflow
sources:
  - "reduxjs/redux-toolkit:docs/api/createAsyncThunk.mdx"
  - "reduxjs/redux-toolkit:docs/api/createListenerMiddleware.mdx"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
  - "reduxjs/redux:docs/tutorials/essentials/part-5-async-logic.md"
---

# Handle Side Effects

## Setup

```ts
import {
  configureStore,
  createListenerMiddleware,
  createSlice,
} from '@reduxjs/toolkit'

const docsSlice = createSlice({
  name: 'docs',
  initialState: { status: 'idle' as 'idle' | 'saved' },
  reducers: {
    saveStarted(state) {
      state.status = 'idle'
    },
    saveFinished(state) {
      state.status = 'saved'
    },
  },
})

const listenerMiddleware = createListenerMiddleware()

export const store = configureStore({
  reducer: {
    docs: docsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const startAppListening =
  listenerMiddleware.startListening.withTypes<RootState, AppDispatch>()
```

## Core Patterns

### Use RTK Query for server cache by default

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Post = { id: string; title: string }

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: ['Post'],
    }),
  }),
})
```

If the problem is server data that should be cached and re-used, start with RTK Query instead of a thunk.

### Use `createAsyncThunk` for imperative workflows

```ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

type Draft = { title: string }

export const draftSaved = createAsyncThunk(
  'drafts/save',
  async (draft: Draft) => {
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })

    return (await response.json()) as { id: string; title: string }
  },
)

const draftsSlice = createSlice({
  name: 'drafts',
  initialState: { status: 'idle' as 'idle' | 'pending' | 'failed' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(draftSaved.pending, (state) => {
        state.status = 'pending'
      })
      .addCase(draftSaved.fulfilled, (state) => {
        state.status = 'idle'
      })
      .addCase(draftSaved.rejected, (state) => {
        state.status = 'failed'
      })
  },
})
```

Use a thunk when you need one imperative async workflow with `dispatch` and `getState`.

### Use listener middleware for reactive workflows

```ts
import { createListenerMiddleware, createSlice } from '@reduxjs/toolkit'

const docsSlice = createSlice({
  name: 'docs',
  initialState: { status: 'idle' as 'idle' | 'saved' },
  reducers: {
    saveFinished(state) {
      state.status = 'saved'
    },
  },
})

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: [] as string[],
  reducers: {
    notificationQueued(state, action: { payload: string }) {
      state.push(action.payload)
    },
  },
})

const listenerMiddleware = createListenerMiddleware()

listenerMiddleware.startListening({
  actionCreator: docsSlice.actions.saveFinished,
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(
      notificationsSlice.actions.notificationQueued('Document saved'),
    )
  },
})
```

Listeners fit workflows that react to future actions or state changes over time instead of driving one imperative request from a single callsite.

## Common Mistakes

### CRITICAL Running side effects inside reducers

Wrong:

```ts
const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as { id: string }[],
  reducers: {
    todoSaved(state, action: { payload: { id: string } }) {
      fetch('/api/todos', { method: 'POST' })
      state.push(action.payload)
    },
  },
})
```

Correct:

```ts
import { createAsyncThunk } from '@reduxjs/toolkit'

const todoSaved = createAsyncThunk('todos/save', async (todo: { id: string }) => {
  await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  })
  return todo
})
```

Reducers must stay pure even when Immer is available.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Using thunks to watch future state changes

Wrong:

```ts
export const waitForSave = () => async (
  _dispatch: unknown,
  getState: () => { docs: { status: string } },
) => {
  while (getState().docs.status !== 'saved') {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
```

Correct:

```ts
startAppListening({
  predicate: (_action, currentState) => currentState.docs.status === 'saved',
  effect: async () => {
    console.log('Document saved')
  },
})
```

Polling inside thunks fights the architecture; listener middleware is the reactive tool.

Source: reduxjs/redux-toolkit:docs/api/createListenerMiddleware.mdx

### HIGH Appending listener middleware after the default checks

Wrong:

```ts
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

const reducer = (state = { ready: true }) => state
const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(listenerMiddleware.middleware),
})
```

Correct:

```ts
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

const reducer = (state = { ready: true }) => state
const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
})
```

Listener add and remove actions may carry functions, so the listener middleware needs to run before serializability checks.

Source: reduxjs/redux-toolkit:docs/api/createListenerMiddleware.mdx

## References

- [Listener helpers and decision heuristics](references/listener-workflows.md)
