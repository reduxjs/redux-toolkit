---
name: evolve-and-diagnose-redux-apps/migrate-to-modern-redux
description: >
  Use this when moving a legacy Redux codebase to current RTK patterns. Covers
  replacing createStore with configureStore, migrating touched reducers to
  createSlice, codemod-assisted RTK 2 updates, and replacing server-data stacks
  with RTK Query instead of writing new legacy Redux code.
type: lifecycle
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - build-modern-redux-apps/modern-redux
sources:
  - "reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx"
  - "reduxjs/redux-toolkit:docs/usage/migrating-rtk-2.md"
  - "reduxjs/redux-toolkit:packages/rtk-codemods/README.md"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
---

# Migrate To Modern Redux

## Setup

```ts
// before
import { applyMiddleware, combineReducers, createStore } from 'redux'
import thunk from 'redux-thunk'

const postsReducer = (state = [] as { id: string; title: string }[]) => state
const usersReducer = (state = [] as { id: string; name: string }[]) => state

const rootReducer = combineReducers({
  posts: postsReducer,
  users: usersReducer,
})

export const legacyStore = createStore(rootReducer, applyMiddleware(thunk))

// after
import { configureStore } from '@reduxjs/toolkit'

const postsReducer = (state = [] as { id: string; title: string }[]) => state
const usersReducer = (state = [] as { id: string; name: string }[]) => state

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    users: usersReducer,
  },
})
```

## Core Patterns

### Replace the store setup first

```ts
import { configureStore } from '@reduxjs/toolkit'

const postsReducer = (state = [] as { id: string; title: string }[]) => state
const usersReducer = (state = [] as { id: string; name: string }[]) => state

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    users: usersReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

This is the one migration step that can happen immediately while old reducers continue to work.

### Migrate reducers as you touch them

```ts
import { createSlice } from '@reduxjs/toolkit'

type TodosState = {
  items: { id: string; text: string; completed: boolean }[]
}

const initialState: TodosState = {
  items: [],
}

export const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    todoAdded(state, action: { payload: { id: string; text: string } }) {
      state.items.push({ ...action.payload, completed: false })
    },
    todoToggled(state, action: { payload: { id: string } }) {
      const todo = state.items.find((item) => item.id === action.payload.id)
      if (todo) {
        todo.completed = !todo.completed
      }
    },
  },
})
```

Once a reducer needs editing, migrate that reducer instead of adding more legacy code to it.

### Use codemods for mechanical updates

```bash
npx @reduxjs/rtk-codemods createSliceBuilder src/features/posts/postsSlice.ts
npx @reduxjs/rtk-codemods createReducerBuilder src/features/posts/postsReducer.ts
```

Use codemods for repetitive RTK API migrations, then review the result and finish the semantic cleanup by hand.

### Replace legacy server-data stacks with RTK Query

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Todo = { id: string; text: string }

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (build) => ({
    getTodos: build.query<Todo[], void>({
      query: () => 'todos',
    }),
  }),
})
```

When the old code is just request status plus fetched data, migrate toward RTK Query instead of carrying the thunk stack forward forever.

## Common Mistakes

### HIGH Attempting a big-bang rewrite

Wrong:

```ts
// Replace every reducer, every connected component, and every async flow
// in one branch before shipping anything.
```

Correct:

```ts
// 1) Switch createStore to configureStore
// 2) Migrate one touched reducer to createSlice
// 3) Convert touched connected components to hooks
// 4) Repeat without introducing new legacy Redux code
```

Modern Redux migration is incremental, but once the store is modernized new work should stop adding legacy patterns.

Source: reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx

### CRITICAL Carrying removed RTK 2 config forms forward

Wrong:

```ts
configureStore({
  reducer,
  middleware: [logger],
})
```

Correct:

```ts
configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger),
})
```

RTK 2 removed array middleware configuration and other older builder forms that agents trained on RTK 1.x still emit.

Source: reduxjs/redux-toolkit:docs/usage/migrating-rtk-2.md

### HIGH Preserving hand-written fetch state by default

Wrong:

```ts
import { createAsyncThunk } from '@reduxjs/toolkit'

type Todo = { id: string; text: string }

const initialState = {
  items: [] as Todo[],
  status: 'idle' as 'idle' | 'pending' | 'failed',
}

export const fetchTodos = createAsyncThunk('todos/fetch', async () => {
  const response = await fetch('/api/todos')
  return (await response.json()) as Todo[]
})
```

Correct:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Todo = { id: string; text: string }

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (build) => ({
    getTodos: build.query<Todo[], void>({
      query: () => 'todos',
    }),
  }),
})
```

If the feature is really server cache, keep the migration moving toward RTK Query instead of rebuilding the old loading-flag architecture in new APIs.

Source: reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx
