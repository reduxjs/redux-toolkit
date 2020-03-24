---
id: other-exports
title: Other Exports
sidebar_label: Other Exports
hide_title: true
---

# Other Exports

Redux Toolkit exports some of its internal utilities, and re-exports additional functions from other dependencies as well.

## Internal Exports

### `createImmutableStateInvariantMiddleware`

Creates an instance of the `immutable-state-invariant` middleware described in [`getDefaultMiddleware`](./getDefaultMiddleware.md).

Accepts a single configuration object parameter, with the following options:

```ts
function createImmutableStateInvariantMiddleware({
  // The function to check if a value is considered to be immutable.
  // This function is applied recursively to every value contained in the state.
  // The default implementation will return true for primitive types (like numbers, strings, booleans, null and undefined).
  isImmutable?: (value: any) => boolean
  // An array of dot-separated path strings that match named nodes from the root state to ignore when checking for immutability.
  // Defaults to undefined
  ignoredPaths?: string[]
})
```

Example:

```js
import {
  createSlice,
  configureStore,
  createImmutableStateInvariantMiddleware
} from '@reduxjs/toolkit'

const exampleSlice = createSlice({
  name: 'example',
  initialState: {
    user: 'will track changes',
    ignoredPath: 'single level',
    ignoredNested: {
      one: 'one',
      two: 'two'
    }
  },
  reducers: {}
})

const immutableInvariantMiddleware = createImmutableStateInvariantMiddleware({
  ignoredPaths: ['ignoredPath', 'ignoredNested.one', 'ignoredNested.two']
})

const store = configureStore({
  reducer: exampleSlice.reducer,
  middleware: [immutableInvariantMiddleware]
})
```

### `createSerializableStateInvariantMiddleware`

Creates an instance of the `serializable-state-invariant` middleware described in [`getDefaultMiddleware`](./getDefaultMiddleware.md).

Accepts a single configuration object parameter, with the following options:

```ts
function createSerializableStateInvariantMiddleware({
  // The function to check if a value is considered serializable.
  // This function is applied recursively to every value contained in the state.
  // Defaults to `isPlain()`.
  isSerializable?: (value: any) => boolean
  // The function that will be used to retrieve entries from each value.
  // If unspecified, `Object.entries` will be used.
  // Defaults to `undefined`.
  getEntries?: (value: any) => [string, any][]
  // An array of action types to ignore when checking for serializability.
  // Defaults to []
  ignoredActions?: string[]
  // An array of dot-separated path strings to ignore when checking for serializability.
  // Defaults to []
  ignoredPaths?: string[]
})
```

Example:

```js
import { Iterable } from 'immutable'
import {
  configureStore,
  createSerializableStateInvariantMiddleware,
  isPlain
} from '@reduxjs/toolkit'

// Augment middleware to consider Immutable.JS iterables serializable
const isSerializable = value => Iterable.isIterable(value) || isPlain(value)

const getEntries = value =>
  Iterable.isIterable(value) ? value.entries() : Object.entries(value)

const serializableMiddleware = createSerializableStateInvariantMiddleware({
  isSerializable,
  getEntries
})

const store = configureStore({
  reducer,
  middleware: [serializableMiddleware]
})
```

### `isPlain`

The default function used to determine if a value is considered serializable.

Current definition:

```js
function isPlain(val) {
  return (
    typeof val === 'undefined' ||
    val === null ||
    typeof val === 'string' ||
    typeof val === 'boolean' ||
    typeof val === 'number' ||
    Array.isArray(val) ||
    isPlainObject(val)
  )
}
```

## Exports from Other Libraries

### `createNextState`

The default immutable update function from the [`immer` library](https://immerjs.github.io/immer/), re-exported here as `createNextState` (also commonly referred to as [`produce`](https://immerjs.github.io/immer/docs/produce))

### `combineReducers`

Redux's [`combineReducers`](https://redux.js.org/api/combinereducers), re-exported for convenience. While `configureStore` calls this internally, you may wish to call it yourself to compose multiple levels of slice reducers.

### `compose`

Redux's [`compose`](https://redux.js.org/api/compose). It composes functions from right to left.
This is a functional programming utility. You might want to use it to apply several store custom enhancers/ functions in a row.

### `bindActionCreators`

Redux's [`bindActionCreators`](https://redux.js.org/api/bindactioncreators). It wraps action creators with `dispatch()` so that they dispatch immediately when called.

### `createStore`

Redux's [`createStore`](https://redux.js.org/api/createstore). You should not need to use this directly.

### `applyMiddleware`

Redux's [`applyMiddleware`](https://redux.js.org/api/applymiddleware). You should not need to use this directly.
