---
id: configureStore
title: configureStore
sidebar_label: configureStore
hide_title: true
---

# `configureStore`

A friendlier abstraction over the standard Redux `createStore` function. Takes a single configuration object parameter, with the following options:

```ts
function configureStore({
    // A single reducer function that will be used as the root reducer,
    // or an object of slice reducers that will be passed to combineReducers()
    reducer: Object<string, Function> | Function,
    // An array of Redux middlewares.  If not supplied, adds the middleware returned by getDefaultMiddleware()
    middleware: Array<MiddlewareFunction>,
    // Built-in support for devtools. Defaults to true.
    devTools: boolean,
    // Same as current createStore.
    preloadedState : State,
    // Same as current createStore.
    enhancer : ReduxStoreEnhancer,
})
```

For details on how the `middleware` parameter works and the list of middleware that are added by default, see the
[`getDefaultMiddleware` docs page](./getDefaultMiddleware.md)

Basic usage:

```js
import { configureStore } from 'redux-starter-kit'

import rootReducer from './reducers'

const store = configureStore({ reducer: rootReducer })
// The store now has redux-thunk added and the Redux DevTools Extension is turned on
```

Full example:

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
  devTools: NODE_ENV !== 'production',
  preloadedState,
  enhancers: [reduxBatch]
})

// The store has been created with these options:
// - The slice reducers were automatically passed to combineReducers()
// - redux-thunk and redux-logger were added as middleware
// - The Redux DevTools Extension is disabled for production
// - The middleware, batch, and devtools enhancers were automatically composed together
```
