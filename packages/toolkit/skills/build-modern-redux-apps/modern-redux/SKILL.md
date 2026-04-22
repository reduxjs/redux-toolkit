---
name: build-modern-redux-apps/modern-redux
description: >
  Use this when setting up a new Redux Toolkit app or modernizing an existing
  React + Redux codebase. Covers configureStore, Provider wiring, typed hooks,
  hooks-first React-Redux usage, feature folders, and the correct store lifetime
  for SPA and SSR-heavy React environments.
type: lifecycle
library: "@reduxjs/toolkit"
library_version: "2.11.2"
requires:
  - build-modern-redux-apps/redux-dataflow
sources:
  - "reduxjs/redux-toolkit:docs/tutorials/quick-start.mdx"
  - "reduxjs/redux-toolkit:docs/tutorials/typescript.md"
  - "reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx"
  - "reduxjs/redux-toolkit:docs/usage/nextjs.mdx"
  - "reduxjs/redux:docs/style-guide/style-guide.md"
---

# Modern Redux

## Setup

```tsx
// file: src/features/counter/counterSlice.ts
import { createSlice } from '@reduxjs/toolkit'

export const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1
    },
  },
})

export const { increment } = counterSlice.actions

// file: src/app/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { counterSlice } from '../features/counter/counterSlice'

export const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// file: src/app/hooks.ts
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

// file: src/features/counter/Counter.tsx
import { increment } from './counterSlice'
import { useAppDispatch, useAppSelector } from '../../app/hooks'

export function Counter() {
  const value = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return <button onClick={() => dispatch(increment())}>{value}</button>
}

// file: src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { Counter } from './features/counter/Counter'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <Counter />
  </Provider>,
)
```

## Core Patterns

### Keep React components on hooks, not wrappers

```tsx
import { postAdded, selectPosts } from './postsSlice'
import { useAppDispatch, useAppSelector } from '../../app/hooks'

export function PostsList() {
  const posts = useAppSelector(selectPosts)
  const dispatch = useAppDispatch()

  return (
    <button
      onClick={() =>
        dispatch(postAdded({ id: 'p2', title: 'Write docs' }))
      }
    >
      {posts.length}
    </button>
  )
}
```

Hooks are the default React-Redux integration for new code.

### Create the store inside the provider for SSR-heavy React apps

```tsx
// file: src/lib/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { counterSlice } from '../features/counter/counterSlice'

export const makeStore = () =>
  configureStore({
    reducer: {
      counter: counterSlice.reducer,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

// file: src/app/StoreProvider.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore)

  return <Provider store={store}>{children}</Provider>
}
```

In SSR-heavy React frameworks, create a store per request and keep that instance stable across renders.

### Keep app wiring in `app/` and feature logic in feature folders

```text
src/
  app/
    store.ts
    hooks.ts
  features/
    posts/
      postsSlice.ts
      PostsList.tsx
    users/
      usersSlice.ts
      UsersList.tsx
```

This keeps store wiring centralized and feature logic colocated.

## Common Mistakes

### HIGH Importing the store in React components

Wrong:

```tsx
import { store } from '../../app/store'

export function PostsList() {
  const posts = store.getState().posts
  return <div>{posts.length}</div>
}
```

Correct:

```tsx
import { useAppSelector } from '../../app/hooks'

export function PostsList() {
  const posts = useAppSelector((state) => state.posts)
  return <div>{posts.length}</div>
}
```

React components should read through context and hooks; direct store imports are a separate escape hatch for non-React integrations, not the default UI pattern.

Source: reduxjs/redux:docs/style-guide/style-guide.md

### HIGH Defaulting to `connect()` in new React code

Wrong:

```tsx
import { connect } from 'react-redux'

const increment = () => ({ type: 'counter/increment' as const })
const mapState = (state: { counter: { value: number } }) => ({
  value: state.counter.value,
})
const mapDispatch = { increment }

function Counter({ value, increment }: ReturnType<typeof mapState> & typeof mapDispatch) {
  return <button onClick={() => increment()}>{value}</button>
}

export default connect(mapState, mapDispatch)(Counter)
```

Correct:

```tsx
import { increment } from './counterSlice'
import { useAppDispatch, useAppSelector } from '../../app/hooks'

export function Counter() {
  const value = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return <button onClick={() => dispatch(increment())}>{value}</button>
}
```

Hooks are the modern default, simpler to type, and the maintainers explicitly want agents to steer new code away from `connect`.

Source: reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx

### HIGH Recreating the store during render in SSR-heavy apps

Wrong:

```tsx
'use client'

import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'

export function StoreProvider({ children }: { children: import('react').ReactNode }) {
  const store = makeStore()
  return <Provider store={store}>{children}</Provider>
}
```

Correct:

```tsx
'use client'

import { useState } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'

export function StoreProvider({ children }: { children: import('react').ReactNode }) {
  const [store] = useState(makeStore)
  return <Provider store={store}>{children}</Provider>
}
```

A new store on every render loses client state, while a module singleton can leak across requests on the server.

Source: reduxjs/redux-toolkit:docs/usage/nextjs.mdx

### HIGH Keeping `createStore` boilerplate as the default

Wrong:

```ts
import { applyMiddleware, combineReducers, createStore } from 'redux'
import thunk from 'redux-thunk'

const counterReducer = (state = { value: 0 }) => state

const rootReducer = combineReducers({
  counter: counterReducer,
})

export const store = createStore(rootReducer, applyMiddleware(thunk))
```

Correct:

```ts
import { configureStore } from '@reduxjs/toolkit'

const counterReducer = (state = { value: 0 }) => state

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
})
```

Manual store setup works, but it throws away RTK's default middleware, dev checks, and the current recommended baseline.

Source: reduxjs/redux-toolkit:docs/usage/migrating-to-modern-redux.mdx

## References

- [Store lifetime and framework boundaries](references/store-lifetime.md)
