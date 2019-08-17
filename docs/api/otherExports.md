---
id: other-exports
title: Other Exports
sidebar_label: Other Exports
hide_title: true
---

# Other Exports

Redux Starter Kit exports some of its internal utilities, and re-exports additional functions from other dependencies as well.

## Internal Exports

### `createSerializableStateInvariantMiddleware`

Creates an instance of the `serializable-state-invariant` middleware described in [`getDefaultMiddleware`](./getDefaultMiddleware.md).

Accepts an options object with `isSerializable` and `getEntries` parameters.  The former, `isSerializable`, will be used to determine if a value is considered serializable or not. If not provided, this defaults to `isPlain`.  The latter, `getEntries`, will be used to retrieve nested values.  If not provided, `Object.entries` will be used by default. `ignoredActions` accepts an array of action types to ignore from serialization check

Example:

```js
import { Iterable } from 'immutable';
import {
  configureStore,
  createSerializableStateInvariantMiddleware,
  isPlain
} from 'redux-starter-kit'

// Augment middleware to consider Immutable.JS iterables serializable
const isSerializable = (value) =>
  Iterable.isIterable(value) || isPlain(value)

const getEntries = (value) =>
  Iterable.isIterable(value) ? value.entries() : Object.entries(value)

const ignoredActions = []
// const ignoredActions = ['persist/PERSIST']

const serializableMiddleware = createSerializableStateInvariantMiddleware({
  isSerializable,
  getEntries,
  ignoredActions,
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

The default immutable update function from the [`immer` library](https://github.com/mweststrate/immer#api), re-exported here as `createNextState` (also commonly referred to as `produce`)

### `combineReducers`

Redux's `combineReducers`, re-exported for convenience. While `configureStore` calls this internally, you may wish to call it yourself to compose multiple levels of slice reducers.

### `compose`

Redux's `compose`. It composes functions from right to left.
This is a functional programming utility. You might want to use it to apply several store custom enhancers/ functions in a row.
