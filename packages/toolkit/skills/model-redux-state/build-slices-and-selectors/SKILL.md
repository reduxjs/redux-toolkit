---
name: model-redux-state/build-slices-and-selectors
description: >
  Use this when authoring or refactoring slices with createSlice, selectors,
  create.asyncThunk, entity adapters, or lazy reducer injection. Covers
  Immer-backed mutation syntax, slice selectors, getSelectors, injectInto,
  withLazyLoadedSlices, and current RTK 2 slice patterns.
type: core
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - model-redux-state/design-state-ownership
sources:
  - "reduxjs/redux-toolkit:docs/api/createSlice.mdx"
  - "reduxjs/redux-toolkit:docs/api/combineSlices.mdx"
  - "reduxjs/redux-toolkit:docs/api/createEntityAdapter.mdx"
  - "reduxjs/redux-toolkit:docs/usage/immer-reducers.md"
  - "reduxjs/redux-toolkit:docs/usage/migrating-rtk-2.md"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
---

# Build Slices And Selectors

## Setup

```ts
// file: src/app/createAppSlice.ts
import { asyncThunkCreator, buildCreateSlice } from '@reduxjs/toolkit'

export const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

// file: src/features/posts/postsSlice.ts
import { createSelector } from '@reduxjs/toolkit'
import { createAppSlice } from '../../app/createAppSlice'

type PostsState = {
  items: { id: string; title: string; published: boolean }[]
  status: 'idle' | 'pending' | 'succeeded' | 'failed'
}

const initialState: PostsState = {
  items: [],
  status: 'idle',
}

export const postsSlice = createAppSlice({
  name: 'posts',
  initialState,
  reducers: (create) => ({
    postAdded: create.reducer<{ id: string; title: string }>((state, action) => {
      state.items.push({ ...action.payload, published: false })
    }),
    fetchPosts: create.asyncThunk(
      async () => {
        const response = await fetch('/api/posts')
        return (await response.json()) as { id: string; title: string; published: boolean }[]
      },
      {
        pending: (state) => {
          state.status = 'pending'
        },
        fulfilled: (state, action) => {
          state.status = 'succeeded'
          state.items = action.payload
        },
        rejected: (state) => {
          state.status = 'failed'
        },
      },
    ),
  }),
  selectors: {
    selectPosts: (state) => state.items,
    selectPublishedPosts: createSelector(
      [(state: PostsState) => state.items],
      (items) => items.filter((post) => post.published),
    ),
  },
})

export const { postAdded, fetchPosts } = postsSlice.actions
export const { selectPosts, selectPublishedPosts } = postsSlice.selectors
```

## Core Patterns

### Use mutating logic inside slice reducers

```ts
import { createSlice } from '@reduxjs/toolkit'

const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as { id: string; text: string; done: boolean }[],
  reducers: {
    todoAdded(state, action: { payload: { id: string; text: string } }) {
      state.push({ ...action.payload, done: false })
    },
    todoToggled(state, action: { payload: { id: string } }) {
      const todo = state.find((item) => item.id === action.payload.id)
      if (todo) {
        todo.done = !todo.done
      }
    },
  },
})
```

Immer is the default inside `createSlice`; write the reducer logic directly instead of copying arrays and objects by hand.

### Define selectors in the slice when they belong to the slice

```ts
import { createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1
    },
  },
  selectors: {
    selectValue: (state) => state.value,
    selectIsPositive: (state) => state.value > 0,
  },
})

const { selectValue, selectIsPositive } = counterSlice.selectors
```

Slice selectors keep state-location knowledge next to the slice.

### Use `create.asyncThunk` when the async lifecycle belongs to the slice

```ts
import { asyncThunkCreator, buildCreateSlice } from '@reduxjs/toolkit'

const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

const usersSlice = createAppSlice({
  name: 'users',
  initialState: { items: [] as { id: string; name: string }[], status: 'idle' as 'idle' | 'pending' | 'failed' },
  reducers: (create) => ({
    fetchUsers: create.asyncThunk(
      async () => {
        const response = await fetch('/api/users')
        return (await response.json()) as { id: string; name: string }[]
      },
      {
        pending: (state) => {
          state.status = 'pending'
        },
        fulfilled: (state, action) => {
          state.status = 'idle'
          state.items = action.payload
        },
        rejected: (state) => {
          state.status = 'failed'
        },
      },
    ),
  }),
})
```

Use this when the async lifecycle handlers naturally live with the slice; otherwise regular `createAsyncThunk` is still fine.

### Use entity adapters and lazy injection for scalable slices

```ts
import {
  combineSlices,
  createEntityAdapter,
  createSlice,
} from '@reduxjs/toolkit'

type Book = { bookId: string; title: string }

const booksAdapter = createEntityAdapter<Book>({
  selectId: (book) => book.bookId,
})

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(),
  reducers: {
    booksReceived: booksAdapter.setAll,
  },
})

export interface LazyLoadedSlices {}

export const rootReducer =
  combineSlices().withLazyLoadedSlices<LazyLoadedSlices>()

declare module './rootReducer' {
  export interface LazyLoadedSlices {}
}

const injectedBooksSlice = booksSlice.injectInto(rootReducer)

const selectors = booksAdapter.getSelectors(
  (state: ReturnType<typeof rootReducer.selector.original>) =>
    injectedBooksSlice.selectSlice(state),
)
```

Entity adapters standardize normalized collections, and `injectInto` lets a slice stay aware of its injected location.

## Common Mistakes

### CRITICAL Using mutating logic outside slice reducers

Wrong:

```ts
type Todo = { id: string; text: string }

export function addTodo(todos: Todo[], todo: Todo) {
  todos.push(todo)
  return todos
}
```

Correct:

```ts
type Todo = { id: string; text: string }

const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    todoAdded(state, action: { payload: Todo }) {
      state.push(action.payload)
    },
  },
})
```

Mutation syntax is only safe inside Immer-backed reducer contexts such as `createSlice` and `createReducer`.

Source: reduxjs/redux-toolkit:docs/usage/immer-reducers.md

### HIGH Writing hand-written switch reducers as the default

Wrong:

```ts
export default function todosReducer(state = initialState, action: { type: string; payload?: Todo }) {
  switch (action.type) {
    case 'todos/todoAdded':
      return state.concat(action.payload as Todo)
    default:
      return state
  }
}
```

Correct:

```ts
const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    todoAdded(state, action: { payload: Todo }) {
      state.push(action.payload)
    },
  },
})
```

Hand-written reducers are an escape hatch for proven bottlenecks, not the normal thing an agent should generate in RTK code.

Source: reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx

### HIGH Writing RTK 1.x object syntax for `extraReducers`

Wrong:

```ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const initialState = { items: [] as { id: string; title: string }[] }

const fetchPosts = createAsyncThunk('posts/fetch', async () => {
  const response = await fetch('/api/posts')
  return (await response.json()) as { id: string; title: string }[]
})

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
  extraReducers: {
    [fetchPosts.fulfilled.type]: (state, action) => {
      state.items = action.payload
    },
  },
})
```

Correct:

```ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const initialState = { items: [] as { id: string; title: string }[] }

const fetchPosts = createAsyncThunk('posts/fetch', async () => {
  const response = await fetch('/api/posts')
  return (await response.json()) as { id: string; title: string }[]
})

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchPosts.fulfilled, (state, action) => {
      state.items = action.payload
    })
  },
})
```

RTK 2 removed the object form; agents trained on RTK 1.x still generate it.

Source: reduxjs/redux-toolkit:docs/usage/migrating-rtk-2.md

### HIGH Assuming `entity.id` exists for every collection

Wrong:

```ts
type Book = { bookId: string; title: string }

const booksAdapter = createEntityAdapter<Book>()
```

Correct:

```ts
type Book = { bookId: string; title: string }

const booksAdapter = createEntityAdapter<Book>({
  selectId: (book) => book.bookId,
})
```

Adapters default to `entity.id`; collections keyed by another field must provide `selectId`.

Source: reduxjs/redux-toolkit:docs/api/createEntityAdapter.mdx

## References

- [Slice selectors, async creators, and lazy injection details](references/slice-patterns.md)
