---
id: other-exports
title: Other Exports
sidebar_label: Other Exports
hide_title: true
---

# Other Exports

`redux-starter-kit` re-exports additional functions from other dependencies as well.

## `createNextState`

The default immutable update function from the [`immer` library](https://github.com/mweststrate/immer#api), re-exported here as `createNextState` (also commonly referred to as `produce`)

## `combineReducers`

Redux's `combineReducers`, re-exported for convenience. While `configureStore` calls this internally, you may wish to call it yourself to compose multiple levels of slice reducers.

## `compose`

Redux's `compose`. It composes functions from right to left.
This is a functional programming utility. You might want to use it to apply several store custom enhancers/ functions in a row.
