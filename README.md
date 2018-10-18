# redux-starter-kit

[![npm version](https://img.shields.io/npm/v/redux-starter-kit.svg?style=flat-square)](https://www.npmjs.com/package/redux-starter-kit)
[![npm downloads](https://img.shields.io/npm/dm/redux-starter-kit.svg?style=flat-square)](https://www.npmjs.com/package/redux-starter-kit)

**A simple set of tools to make using Redux easier**

`npm install redux-starter-kit`

(Special thanks to Github user @shotak for donating to the package name.)

### Purpose

The `redux-starter-kit` package is intended to help address three common complaints about Redux:

- "Configuring a Redux store is too complicated"
- "I have to add a lot of packages to get Redux to do anything useful"
- "Redux requires too much boilerplate code"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app) and [`apollo-boost`](https://dev-blog.apollodata.com/zero-config-graphql-state-management-27b1f1b3c2c3), we can try to provide some tools that abstract over the setup process and handle the most common use cases, as well as include some useful utilities that will let the user simplify their application code.

This package is _not_ intended to solve every possible complaint about Redux, and is deliberately limited in scope. It does _not_ address concepts like "reusable encapsulated Redux modules", data fetching, folder or file structures, managing entity relationships in the store, and so on.

### What's Included

`redux-starter-kit` includes:

- A `configureStore()` function with simplified configuration options. It can automatically combine your slice reducers, adds whatever Redux middleware you supply, includes `redux-thunk` by default, and enables use of the Redux DevTools Extension.
- A `createReducer()` utility that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements. In addition, it automatically uses the [`immer` library](https://github.com/mweststrate/immer) to let you write simpler immutable updates with normal mutative code, like `state.todos[3].completed = true`.
- A `createAction()` utility that returns an action creator function for the given action type string. The function itself has `toString()` defined, so that it can be used in place of the type constant.
- A `createSlice()` function that accepts a set of reducer functions, a slice name, and an initial state value, and automatically generates corresponding action creators, types, and simple selector functions.
- An improved version of the widely used `createSelector` utility for creating memoized selector functions, which can accept string keypaths as "input selectors" (re-exported from the [`selectorator` library](https://github.com/planttheidea/selectorator)).

### API Reference

#### `configureStore`

A friendlier abstraction over the standard Redux `createStore` function. Takes a single configuration object parameter, with the following options:

```js
function configureStore({
    // A single reducer function that will be used as the root reducer,
    // or an object of slice reducers that will be passed to combineReducers()
    reducer: Object<string, Function> | Function,
    // An array of Redux middlewares.  If not supplied, defaults to just redux-thunk.
    middleware: Array<MiddlewareFunction>,
    // Built-in support for devtools. Defaults to true.
    devTools: boolean,
    // Same as current createStore.
    preloadedState : State,
    // Same as current createStore.
    enhancer : ReduxStoreEnhancer,
})
```

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

#### `getDefaultMiddleware`

`getDefaultMiddleware` is useful if you need to add custom middlewares without removing redux-starter-kit's default middleware. Currently it returns an array with `redux-thunk`.

#### `createReducer`

A utility function to create reducers that handle specific action types, similar to the example function in the ["Reducing Boilerplate" Redux docs page](https://redux.js.org/recipes/reducing-boilerplate#generating-reducers). Takes an initial state value and an object that maps action types to case reducer functions. Internally, it uses the [`immer` library](https://github.com/mweststrate/immer), so you can write code in your case reducers that mutates the existing `state` value, and it will correctly generate immutably-updated state values instead.

```js
function createReducer(
  initialState: State,
  actionsMap: Object<String, Function>
) {}
```

Example usage:

```js
import { createReducer } from 'redux-starter-kit'

function addTodo(state, action) {
  const { newTodo } = action.payload

  // Can safely call state.push() here
  state.push({ ...newTodo, completed: false })
}

function toggleTodo(state, action) {
  const { index } = action.payload

  const todo = state[index]
  // Can directly modify the todo object
  todo.completed = !todo.completed
}

const todosReducer = createReducer([], {
  ADD_TODO: addTodo,
  TOGGLE_TODO: toggleTodo
})
```

This doesn't mean that you _have to_ write code in your case reducers that mutates the existing `state` value, you can still write code that updates the state immutably. You can think of `immer` as a safety net, if the code is written in a way that mutates the state directly, `immer` will make sure that such update happens immutably. On the other hand the following code is still valid:

```js
import { createReducer } from 'redux-starter-kit'

function addTodo(state, action) {
  const { newTodo } = action.payload

  // Updates the state immutably without relying on immer
  return [...state, { ...newTodo, completed: false }]
}

function toggleTodo(state, action) {
  const { index } = action.payload

  const todo = state[index]
  // Updates the todo object immutably withot relying on immer
  return state.map((todo, i) => {
    if (i !== index) return todo
    return { ...todo, completed: !todo.completed }
  })
}

const todosReducer = createReducer([], {
  ADD_TODO: addTodo,
  TOGGLE_TODO: toggleTodo
})
```

#### `createAction`

A utility function to create an action creator for the given action type string. The action creator accepts a single argument, which will be included in the action object as a field called `payload`. The action creator function will also have its `toString()` overriden so that it returns the action type, allowing it to be used in reducer logic that is looking for that action type.

```js
// actions.js
import { createAction } from 'redux-starter-kit'

export const increment = createAction('increment')

console.log(increment)
// "increment"

const theAction = increment(5)
console.log(theAction)
// {type : "increment", payload : 5}

// reducer.js
import { increment } from './actions'

function counterReducer(state = 0, action) {
  switch (action.type) {
    // action creator can be used directly as the type for comparisons
    case increment: {
      return state + action.payload
    }
    default:
      return state
  }
}
```

Since action creators returned by `createAction` have `toString()` overridden, they can be used in `createReducer` as a key in the `actionsMap`:

```js
// reducer.js
import { createReducer } from 'redux-starter-kit'
import { increment } from './actions'

const counterReducer = createReducer(0, {
  [increment]: (state, action) => state + action.payload
})
```

#### `createSlice`

A function that accepts an initial state, an object full of reducer functions, and optionally a "slice name", and automatically generates action creators, action types, and selectors that correspond to the reducers and state.

The reducers will be wrapped in the `createReducer()` utility, and so they can safely "mutate" the state they are given.

```js
import { createSlice } from 'redux-starter-kit'
import { createStore, combineReducers } from 'redux'

const counter = createSlice({
  slice: 'counter', // slice is optional, and could be blank ''
  initialState: 0,
  reducers: {
    increment: state => state + 1,
    decrement: state => state - 1,
    multiply: (state, action) => state * payload
  }
})

const user = createSlice({
  slice: 'user',
  initialState: { name: '' },
  reducers: {
    setUserName: (state, payload) => {
      state.name = action.payload // mutate the state all you want with immer
    }
  }
})

const reducer = combineReducers({
  counter: counter.reducer,
  user: user.reducer
})

const store = createStore(reducer)

store.dispatch(counter.actions.increment())
// -> { counter: 1, user: {} }
store.dispatch(counter.actions.increment())
// -> { counter: 1, user: {} }
store.dispatch(counter.actions.multiply(3))
// -> { counter: 6, user: {} }
console.log(`${counter.actions.decrement}`)
// -> counter/decrement
store.dispatch(user.actions.setUserName('eric'))
// -> { counter: 6, user: { name: 'eric' } }
const state = store.getState()
console.log(user.selectors.getUser(state))
// -> { name: 'eric' }
console.log(counter.selectors.getCounter(state))
// -> 6
```

#### `createSelector`

The `createSelector` utility from the [`selectorator` library](https://github.com/planttheidea/selectorator), re-exported for ease of use. It acts as a superset of the standard `createSelector` function from [Reselect](https://github.com/reactjs/reselect). The primary improvements are the ability to define "input selectors" using string keypaths, or return an object result based on an object of keypaths. It also accepts an object of customization options for more specific use cases.

For more specifics, see the [`selectorator` usage documentation](https://github.com/planttheidea/selectorator#usage).

```js
function createSelector(
    // Can either be:
    //    - An array containing selector functions, string keypaths, and argument objects
    //    - An object whose keys are selector functions and string keypaths
    paths : Array<Function | string | Object> | Object<string, string | Function>
)
```

Example usage:

```js
// Define input selector using a string keypath
const getSubtotal = createSelector(['shop.items'], items => {
  // return value here
})

// Define input selectors as a mix of other selectors and string keypaths
const getTax = createSelector(
  [getSubtotal, 'shop.taxPercent'],
  (subtotal, taxPercent) => {
    // return value here
  }
)

// Define input selector using a custom argument index to access a prop
const getTabContent = createSelector(
  [{ path: 'tabIndex', argIndex: 1 }],
  tabIndex => {
    // return value here
  }
)

const getContents = createSelector({ foo: 'foo', bar: 'nested.bar' })
// Returns an object like:  {foo, bar}
```

#### `createNextState`

The default immutable update function from the [`immer` library](https://github.com/mweststrate/immer#api), re-exported here as `createNextState` (also commonly referred to as `produce`)

#### `combineReducers`

Redux's `combineReducers`, re-exported for convenience. While `configureStore` calls this internally, you may wish to call it yourself to compose multiple levels of slice reducers.

#### `compose`

Redux's `compose`. It composes functions from right to left.
This is a functional programming utility. You might want to use it to apply several store custom enhancers/ functions in a row.
