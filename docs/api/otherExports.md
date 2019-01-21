---
id: other-exports
title: Other Exports
sidebar_label: Other Exports
hide_title: true
---

# Other Exports

`redux-starter-kit` exports some of its internal utilities, and re-exports additional functions from other dependencies as well.


## Internal Exports


### `createSerializableStateInvariantMiddleware`

Creates an instance of the `serializable-state-invariant` middleware described in [`getDefaultMiddleware`](./getDefaultMiddleware.md).

Accepts an options object with an `isSerializable` parameter, which will be used
to determine if a value is considered serializable or not.  If not provided, this
defaults to `isPlain`.

Example:

```js
import {configureStore, createSerializableStateInvariantMiddleware} from "redux-starter-kit";

const serializableMiddleware = createSerializableStateInvariantMiddleware({
    isSerializable: () => true // all values will be accepted
});

const store = configureStore({
    reducer,
    middleware : [serializableMiddleware],
});
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
