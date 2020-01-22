---
id: getDefaultMiddleware
title: getDefaultMiddleware
sidebar_label: getDefaultMiddleware
hide_title: true
---

# `getDefaultMiddleware`

Returns an array containing the default list of middleware.

## Intended Usage

By default, [`configureStore`](./configureStore.md) adds some middleware to the Redux store setup automatically.

```js
const store = configureStore({
  reducer: rootReducer
})

// Store has one or more middleware added, because the middleware list was not customized
```

If you want to customize the list of middleware, you can supply an array of middleware functions to `configureStore`:

```js
const store = configureStore({
  reducer: rootReducer,
  middleware: [thunk, logger]
})

// Store specifically has the thunk and logger middleware applied
```

However, when you supply the `middleware` option, you are responsible for defining _all_ the middleware you want added
to the store. `configureStore` will not add any extra middleware beyond what you listed.

`getDefaultMiddleware` is useful if you want to add some custom middleware, but also still want to have the default
middleware added as well:

```js
const store = configureStore({
  reducer: rootReducer,
  middleware: [...getDefaultMiddleware(), logger]
})

// Store has all of the default middleware added, _plus_ the logger middleware
```

## Included Default Middleware

### Development

One of the goals of Redux Toolkit is to provide opinionated defaults and prevent common mistakes. As part of that,
`getDefaultMiddleware` includes some middleware that are added **in development builds of your app only** to
provide runtime checks for two common issues:

- [`redux-immutable-state-invariant`](https://github.com/leoasis/redux-immutable-state-invariant): deeply compares
  state values for mutations. It can detect mutations in reducers during a dispatch, and also mutations that occur between
  dispatches (such as in a component or a selector). When a mutation is detected, it will throw an error and indicate the key
  path for where the mutated value was detected in the state tree.
- [`serializable-state-invariant-middleware`](./otherExports.md#createserializablestateinvariantmiddleware): a custom middleware created specifically for use in Redux Toolkit. Similar in
  concept to `redux-immutable-state-invariant`, but deeply checks your state tree and your actions for non-serializable values
  such as functions, Promises, Symbols, and other non-plain-JS-data values. When a non-serializable value is detected, a
  console error will be printed with the key path for where the non-serializable value was detected.

In addition to these development tool middleware, it also adds [`redux-thunk`](https://github.com/reduxjs/redux-thunk)
by default, since thunks are the basic recommended side effects middleware for Redux.

Currently, the return value is:

```js
const middleware = [thunk, immutableStateInvariant, serializableStateInvariant]
```

### Production

Currently, the return value is:

```js
const middleware = [thunk]
```

## Customizing the Included Middleware

`getDefaultMiddleware` accepts an options object that allows customizing each middleware in two ways:

- Each middleware can be excluded from inclusion in the array by passing `false` for its corresponding field
- Each middleware can have its options customized by passing the matching options object for its corresponding field

This example shows excluding the serializable state check middleware, and passing a specific value for the thunk
middleware's "extra argument":

```ts
const customizedMiddleware = getDefaultMiddleware({
  thunk: {
    extraArgument: myCustomApiService
  },
  serializableCheck: false
})
```

## API Reference

```ts
interface ThunkOptions<E = any> {
  extraArgument: E
}

interface ImmutableStateInvariantMiddlewareOptions {
  isImmutable?: (value: any) => boolean
  ignore?: string[]
}

interface SerializableStateInvariantMiddlewareOptions {
  /**
   * The function to check if a value is considered serializable. This
   * function is applied recursively to every value contained in the
   * state. Defaults to `isPlain()`.
   */
  isSerializable?: (value: any) => boolean
  /**
   * The function that will be used to retrieve entries from each
   * value.  If unspecified, `Object.entries` will be used. Defaults
   * to `undefined`.
   */
  getEntries?: (value: any) => [string, any][]

  /**
   * An array of action types to ignore when checking for serializability, Defaults to []
   */
  ignoredActions?: string[]

  /**
   * An array of dot-separated path strings to ignore when checking for serializability, Defaults to []
   */
  ignoredPaths?: string[]
}

interface GetDefaultMiddlewareOptions {
  thunk?: boolean | ThunkOptions
  immutableCheck?: boolean | ImmutableStateInvariantMiddlewareOptions
  serializableCheck?: boolean | SerializableStateInvariantMiddlewareOptions
}

function getDefaultMiddleware<S = any>(
  options: GetDefaultMiddlewareOptions = {}
): Middleware<{}, S>[]
```
