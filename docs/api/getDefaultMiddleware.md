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

// Store has middleware added, because the middleware list was not customized
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
  middleware: getDefaultMiddleware().concat(logger)
})

// Store has all of the default middleware added, _plus_ the logger middleware
```

## Middleware Callback Notation for `configureStore`

For convenience, the `middleware` property of `configureStore` can be used with a callback notation like this.

```js
const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(logger)
})

// Store has all of the default middleware added, _plus_ the logger middleware
```

While this does not make much of a difference for JavaScript users, using this notation is preferrable to TypeScript users, as that version of `getDefaultMiddleware` is already correctly pre-typed for the `Store`'s type, so no use of generics is necessary.

Also, when using TypeScript, it is preferrable to use the chainable `.concat(...)` and `.prepend(...)` methods of the returned `MiddlewareArray` instead of the array spread operator, as the latter can lose valuable type information under some circumstances.

## Included Default Middleware

### Development

One of the goals of Redux Toolkit is to provide opinionated defaults and prevent common mistakes. As part of that,
`getDefaultMiddleware` includes some middleware that are added **in development builds of your app only** to
provide runtime checks for two common issues:

- [Immutability check middleware](./immutabilityMiddleware.md): deeply compares
  state values for mutations. It can detect mutations in reducers during a dispatch, and also mutations that occur between
  dispatches (such as in a component or a selector). When a mutation is detected, it will throw an error and indicate the key
  path for where the mutated value was detected in the state tree. (Forked from [`redux-immutable-state-invariant`](https://github.com/leoasis/redux-immutable-state-invariant).)

- [Serializability check middleware](./serializabilityMiddleware.md): a custom middleware created specifically for use in Redux Toolkit. Similar in
  concept to `immutable-state-invariant`, but deeply checks your state tree and your actions for non-serializable values
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
  // See "Immutable Middleware" page for definition
}

interface SerializableStateInvariantMiddlewareOptions {
  // See "Serializability Middleware" page for definition
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
