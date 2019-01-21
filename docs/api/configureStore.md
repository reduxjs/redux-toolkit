---
id: configureStore
title: configureStore
sidebar_label: configureStore
hide_title: true
---

# `configureStore`

A friendlier abstraction over the standard Redux `createStore` function. 


## Parameters

`configureStore` accepts a single configuration object parameter, with the following options:

```ts
function configureStore({
    // A single reducer function that will be used as the root reducer,
    // or an object of slice reducers that will be passed to combineReducers()
    reducer: Object<string, ReducerFunction> | ReducerFunction,
    // An array of Redux middlewares.  If not supplied, uses getDefaultMiddleware()
    middleware?: MiddlewareFunction[],
    // Enable support for the Redux DevTools Extension. Defaults to true.
    devTools?: boolean,
    // Same as current createStore.
    preloadedState?: State,
    // An optional array of Redux store enhancers
    enhancers?: ReduxStoreEnhancer[],
})
```

### `reducer`

If this is a single function, it will be directly used as the root reducer for the store.

If it is an object of slice reducers, like `{users : usersReducer, posts : postsReducer}`, 
`configureStore` will automatically create the root reducer by passing this object to the
[Redux `combineReducers` utility](https://redux.js.org/api/combinereducers).


### `middleware`

An optional array of Redux middleware functions.

If this option is provided, it should contain all the middleware functions you
want added to the store.  `configureStore` will automatically pass those to `applyMiddleware`.

If not provided, `configureStore` will call `getDefaultMiddleware` and use the
array of middleware functions it returns.

For more details on how the `middleware` parameter works and the list of middleware that are added by default, see the
[`getDefaultMiddleware` docs page](./getDefaultMiddleware.md).


### `devTools`

A boolean indicating whether  `configureStore` should automatically enable support for [the Redux DevTools browser extension](https://github.com/zalmoxisus/redux-devtools-extension).

Defaults to true.

The Redux DevTools Extension recently added [support for showing action stack traces](https://github.com/zalmoxisus/redux-devtools-extension/blob/d4ef75691ad294646f74bca38b973b19850a37cf/docs/Features/Trace.md) that show exactly where each action was dispatched.  Capturing the traces can add a bit of overhead, so the DevTools Extension allows users to configure whether action stack traces are captured.

If this parameter is true, then `configureStore` will enable capturing action stack traces in development mode only.


### `preloadedState`

An optional initial state value to be passed to the Redux `createStore` function.

### `enhancers`

An optional array of Redux store enhancers.  If included, these will be passed to [the Redux `compose` function](https://redux.js.org/api/compose), and the combined enhancer will be passed to `createStore`.

This should _not_ include `applyMiddleware()` or
the Redux DevTools Extension `composeWithDevTools`, as those are already handled by `configureStore`.


## Usage

### Basic Example

```js
import { configureStore } from 'redux-starter-kit'

import rootReducer from './reducers'

const store = configureStore({ reducer: rootReducer })
// The store now has redux-thunk added and the Redux DevTools Extension is turned on
```

###  Full Example

```js
import { configureStore, getDefaultMiddleware } from 'redux-starter-kit'

// We'll use redux-logger just as an example of adding another middleware
import logger from 'redux-logger'

// And use redux-batch as an example of adding enhancers
import { reduxBatch } from '@manaflair/redux-batch'

import todosReducer from './todos/todosReducer'
import visibilityReducer from './visibility/visibilityReducer'

const reducer = {
  todos: todosReducer,
  visibility: visibilityReducer
}

const middleware = [...getDefaultMiddleware(), logger]

const preloadedState = {
  todos: [
    {
      text: 'Eat food',
      completed: true
    },
    {
      text: 'Exercise',
      completed: false
    }
  ],
  visibilityFilter: 'SHOW_COMPLETED'
}

const store = configureStore({
  reducer,
  middleware,
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState,
  enhancers: [reduxBatch]
})

// The store has been created with these options:
// - The slice reducers were automatically passed to combineReducers()
// - redux-thunk and redux-logger were added as middleware
// - The Redux DevTools Extension is disabled for production
// - The middleware, batch, and devtools enhancers were automatically composed together
```
