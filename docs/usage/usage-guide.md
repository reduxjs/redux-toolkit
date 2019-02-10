---
id: usage-guide
title: Usage Guide
sidebar_label: Usage Guide
hide_title: true
---

# Usage Guide

The Redux core library is deliberately unopinionated. It lets you decide how you want to handle everything, like store setup, what your state contains, and how you want to build your reducers.

This is good in some cases, because it gives you flexibility, but that flexibility isn't always needed. Sometimes we just want the simplest possible way to get started, with some good default behavior out of the box. Or, maybe you're writing a larger application and finding yourself writing some similar code, and you'd like to cut down on how much of that code you have to write by hand.

As described in the [Quick Start](../introduction/quick-start.md) page, the goal of Redux Starter Kit is to help simplify common Redux use cases. It is not intended to be a complete solution for everything you might want to do with Redux, but it should make a lot of the Redux-related code you need to write a lot simpler (or in some cases, eliminate some of the hand-written code entirely).

Redux Starter Kit exports several individual functions that you can use in your application, and adds dependencies on some other packages that are commonly used with Redux. This lets you decide how you to use these in your own application, whether it be a brand new project or updating a large existing app.

Let's look at some of the ways that Redux Starter Kit can help make your Redux-related code better.

## Store Setup

Every Redux app needs to configure and create a Redux store. This usually involves several steps:

- Importing or creating the root reducer function
- Setting up middleware, likely including at least one middleware to handle asynchronous logic
- Configuring the [Redux DevTools Extension](https://github.com/zalmoxisus/redux-devtools-extension)
- Possibly altering some of the logic based on whether the application is being built for development or production.

### Manual Store Setup

The following example from the [Configuring Your Store](https://redux.js.org/recipes/configuring-your-store) page in the Redux docs shows a typical store setup process:

```js
import { applyMiddleware, compose, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunkMiddleware from 'redux-thunk'

import monitorReducersEnhancer from './enhancers/monitorReducers'
import loggerMiddleware from './middleware/logger'
import rootReducer from './reducers'

export default function configureStore(preloadedState) {
  const middlewares = [loggerMiddleware, thunkMiddleware]
  const middlewareEnhancer = applyMiddleware(...middlewares)

  const enhancers = [middlewareEnhancer, monitorReducersEnhancer]
  const composedEnhancers = composeWithDevTools(...enhancers)

  const store = createStore(rootReducer, preloadedState, composedEnhancers)

  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./reducers', () => store.replaceReducer(rootReducer))
  }

  return store
}
```

This example is readable, but the process isn't always straightforward:

- The basic Redux `createStore` function takes positional arguments: `(rootReducer, preloadedState, enhancer)`. Sometimes it's easy to forget which parameter is which.
- The process of setting up middleware and enhancers can be confusing, especially if you're trying to add several pieces of configuration.
- The Redux DevTools Extension docs initially suggest using [some hand-written code that checks the global namespace to see if the extension is available](https://github.com/zalmoxisus/redux-devtools-extension#11-basic-store). Many users copy and paste those snippets, which make the setup code harder to read.

### Simplifying Store Setup with `configureStore`

`configureStore` helps with those issues by:

- Having an options object with "named" parameters, which can be easier to read.
- Letting you provide arrays of middleware and enhancers you want to add to the store, and calling `applyMiddleware` and `compose` for you automatically
- Enabling the Redux DevTools Extension automatically

In addition, `configureStore` adds some middleware by default, each with a specific goal:

- [`redux-thunk`](https://github.com/reduxjs/redux-thunk) is the most commonly used middleware for working with both synchronous and async logic outside of components
- In development, middleware that check for common mistakes like mutating the state or using non-serializable values.

This means the store setup code itself is a bit shorter and easier to read, and also that you get good default behavior out of the box.

The simplest way to use is it is to just pass the root reducer function as a parameter named `reducer`:

```js
import { configureStore } from 'redux-starter-kit'
import rootReducer from './reducers'

const store = configureStore({
  reducer: rootReducer
})

export default store
```

You can also pass an object full of ["slice reducers"](https://redux.js.org/recipes/structuring-reducers/splitting-reducer-logic), and `configureStore` will call [`combineReducers`](https://redux.js.org/api/combinereducers) for you:

```js
import usersReducer from './usersReducer'
import postsReducer from './postsReducer'

const store = configureStore({
  reducer: {
    users: usersReducer,
    posts: postsReducer
  }
})
```

Note that this only works for one level of reducers. If you want to nest reducers, you'll need to call `combineReducers` yourself to handle the nesting.

If you need to customize the store setup, you can pass additional options. Here's what the hot reloading example might look like using Redux Starter Kit:

```js
import { configureStore, getDefaultMiddleware } from 'redux-starter-kit'

import monitorReducersEnhancer from './enhancers/monitorReducers'
import loggerMiddleware from './middleware/logger'
import rootReducer from './reducers'

export default function configureAppStore(preloadedState) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: [loggerMiddleware, ...getDefaultMiddleware()],
    preloadedState,
    enhancers: [monitorReducersEnhancer]
  })

  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./reducers', () => store.replaceReducer(rootReducer))
  }

  return store
}
```

If you provide the `middleware` argument, `configureStore` will only use whatever middleware you've listed. If you want to have some custom middleware _and_ the defaults all together, you can call [`getDefaultMiddleware`](../api/getDefaultMiddleware.md) and include the results in the `middleware` array you provide.

## Writing Reducers

[Reducers](https://redux.js.org/basics/reducers) are the most important Redux concept. A typical reducer function needs to:

- Look at the `type` field of the action object to see how it should respond
- Update its state immutably, by making copies of the parts of the state that need to change and only modifying those copies.

While you can [use any conditional logic you want](https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-2/#switch-statements) in a reducer, the most common approach is a `switch` statement, because it's a straightforward way to handle multiple possible values for a single field. However, many people don't like switch statements. The Redux docs show an example of [writing a function that acts as a lookup table based on action types](https://redux.js.org/recipes/reducing-boilerplate#generating-reducers), but leave it up to users to customize that function themselves.

The other common pain points around writing reducers have to do with updating state immutably. JavaScript is a mutable language, [updating nested immutable data by hand is hard](https://redux.js.org/recipes/structuring-reducers/immutable-update-patterns), and it's easy to make mistakes.

### Simplifying Reducers with `createReducer`

Since the "lookup table" approach is popular, Redux Starter Kit includes a `createReducer` function similar to the one shown in the Redux docs. However, our `createReducer` utility has some special "magic" that makes it even better. It uses the [Immer](https://github.com/mweststrate/immer) library internally, which lets you write code that "mutates" some data, but actually applies the updates immutably. This makes it effectively impossible to accidentally mutate state in a reducer.

In general, any Redux reducer that uses a `switch` statement can be converted to use `createReducer` directly. Each `case` in the switch becomes a key in the object passed to `createReducer`. Immutable update logic, like spreading objects or copying arrays, can probably be converted to direct "mutation". It's also fine to keep the immutable updates as-is and return the updated copies, too.

Here's some examples of how you can use `createReducer`. We'll start with a typical "todo list" reducer that uses switch statements and immutable updates:

```js
function todosReducer(state = [], action) {
    switch(action.type) {
        case "ADD_TODO": {
            return state.concat(action.payload);
        }
        case "TOGGLE_TODO": {
            const {index} = action.payload;
            return state.map( (todo, i) => {
                if(i !== index) return todo;

                return {
                    ...todo,
                    completed : !todo.completed
                };
            });
        } ,
        "REMOVE_TODO" : (state, action) => {
            return state.filter( (todo, i) => i !== action.payload.index)
        }
        default : return state;
    }
}
```

Notice that we specifically call `state.concat()` to return a copied array with the new todo entry, `state.map()` to return a copied array for the toggle case, and use the object spread operator to make a copy of the todo that needs to be updated.

With `createReducer`, we can shorten that example considerably:

```js
const todosReducer = createReducer([], {
    "ADD_TODO" : (state, action) => {
        // "mutate" the array by calling push()
        state.push(action.payload);
    },
    "TOGGLE_TODO" : (state, action) => {
        const todo = state[action.payload.index];
        // "mutate" the object by overwriting a field
        todo.completed = !todo.completed;
    },
    "REMOVE_TODO" : (state, action) => {
        // Can still return an immutably-updated value if we want to
        return state.filter( (todo, i) => i !== action.payload.index)
    }
})
```

The ability to "mutate" the state is especially helpful when trying to update deeply nested state. This complex and painful code:

```js
case "UPDATE_VALUE":
  return {
    ...state,
    first: {
      ...state.first,
      second: {
        ...state.first.second,
        [action.someId]: {
          ...state.first.second[action.someId],
          fourth: action.someValue
        }
      }
    }
  }
```

Can be simplified down to just:

```js
updateValue(state, action) {
    const {someId, someValue} = action.payload;
    state.first.second[someId] = someValue;
}
```

Much better!

### Defining Functions in Objects

In modern JavaScript, there are several legal ways to define both keys and functions in an object (and this isn't specific to Redux), and you can mix and match different key definitions and function definitions. For example, these are all legal ways to define a function inside an object:

```js
const keyName = "ADD_TODO4";

const reducerObject = {
	// Explicit quotes for the key name, arrow function for the reducer
	"ADD_TODO1" : (state, action) => { }

	// Bare key with no quotes, function keyword
	ADD_TODO2 : function(state, action){  }

	// Object literal function shorthand
	ADD_TODO3(state, action) { }

	// Computed property
	[keyName] : (state, action) => { }
}
```

Using the ["object literal function shorthand"](https://www.sitepoint.com/es6-enhanced-object-literals/) is probably the shortest code, but feel free to use whichever of those approaches you want.

### Considerations for Using `createReducer`

While the Redux Starter Kit `createReducer` function can be really helpful, keep in mind that:

- The "mutative" code only works correctly inside of our `createReducer` function
- Immer won't let you mix "mutating" the draft state and also returning a new state value

See the [`createReducer` API reference](../api/createReducer.md) for more details.

## Writing Action Creators

Redux encourages you to [write "action creator" functions](https://blog.isquaredsoftware.com/2016/10/idiomatic-redux-why-use-action-creators/) that encapsulate the process of creating an action object. While this is not strictly required, it's a standard part of Redux usage.

Most action creators are very simple. They take some parameters, and return an action object with a specific `type` field and the parameters inside the action. These parameters are typically put in a field called `payload`, which is part of the [Flux Standard Action](https://github.com/redux-utilities/flux-standard-action) convention for organizing the contents of action objects. A typical action creator might look like:

```js
function addTodo(text) {
  return {
    type: 'ADD_TODO',
    payload: { text }
  }
}
```

### Defining Action Creators with `createAction`

Writing action creators by hand can get tedious. Redux Starter Kit provides a function called `createAction`, which simply generates an action creator that uses the given action type, and turns its argument into the `payload` field:

```js
const addTodo = createAction('ADD_TODO')
addTodo({ text: 'Buy milk' })
// {type : "ADD_TODO", payload : {text : "Buy milk"}})
```

Currently, `createAction` does not let you customize how the `payload` field is defined. You need to pass the entire `payload` you want as the one argument to the action creator. This could be a simple value, or an object full of data. (We may eventually add the ability for `createAction` to accept an argument for a callback that customizes the payload, or allows adding other fields like `meta` to the action.)

### Using Action Creators as Action Types

Redux reducers need to look for specific action types to determine how they should update their state. Normally, this is done by defining action type strings and action creator functions separately. Redux Starter Kit's `createAction` function uses a couple tricks to make this easier.

First, `createAction` overrides the `toString()` method on the action creators it generates. **This means that the action creator itself can be used as the "action type" reference in some places**, such as the keys provided to `createReducer`.

Second, the action type is also defined as a `type` field on the action creator.

```js
const actionCreator = createAction("SOME_ACTION_TYPE");

console.log(actionCreator.toString())
// "SOME_ACTION_TYPE"

console.log(actionCreator.type);
// "SOME_ACTION_TYPE"

const reducer = createReducer({}, {
    // actionCreator.toString() will automatically be called here
    [actionCreator] : (state, action) => {}

    // Or, you can reference the .type field:
    [actionCreator.type] : (state, action) => { }
});
```

This means you don't have to write or use a separate action type variable, or repeat the name and value of an action type like `const SOME_ACTION_TYPE = "SOME_ACTION_TYPE"`.

Unfortunately, the implicit conversion to a string doesn't happen for switch statements. If you want to use one of these action creators in a switch statement, you need to call `actionCreator.toString()` yourself:

```js
const actionCreator = createAction('SOME_ACTION_TYPE')

const reducer = (state = {}, action) => {
  switch (action.type) {
    // ERROR: this won't work correctly!
    case actionCreator: {
      break
    }
    // CORRECT: this will work as expected
    case actionCreator.toString(): {
      break
    }
    // CORRECT: this will also work right
    case actionCreator.type: {
      break
    }
  }
}
```

If you are using Redux Starter Kit with TypeScript, note that the TypeScript compiler may not accept the implicit `toString()` conversion when the action creator is used as an object key. In that case, you may need to either manually cast it to a string (`actionCreator as string`), or use the `.type` field as the key.

## Creating Slices of State

Redux state is typically organized into "slices", defined by the reducers that are passed to `combineReducers`:

```js
import { combineReducers } from 'redux'
import usersReducer from './usersReducer'
import postsReducer from './postsReducer'

const rootReducer = combineReducers({
  users: usersReducer,
  posts: postsReducer
})
```

In this example, both `users` and `posts` would be considered "slices". Both of the reducers:

- "Own" a piece of state, including what the initial value is
- Define how that state is updated
- Define which specific actions result in state updates

The common approach is to define a slice's reducer function in its own file, and the action creators in a second file. Because both functions need to refer to the same action types, those are usually defined in a third file and imported in both places:

```js
// postsConstants.js
const CREATE_POST = 'CREATE_POST'
const UPDATE_POST = 'UPDATE_POST'
const DELETE_POST = 'DELETE_POST'

// postsActions.js
import { CREATE_POST, UPDATE_POST, DELETE_POST } from './postConstants'

export function addPost(id, title) {
  return {
    type: CREATE_POST,
    payload: { id, title }
  }
}

// postsReducer.js
import { CREATE_POST, UPDATE_POST, DELETE_POST } from './postConstants'

const initialState = []

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_POST: {
      // omit implementation
    }
    default:
      return state
  }
}
```

The only truly necessary part here is the reducer itself. Consider the other parts:

- We could have written the action types as inline strings in both places.
- The action creators are good, but they're not _required_ to use Redux - a component could skip supplying a `mapDispatch` argument to `connect`, and just call `this.props.dispatch({type : "CREATE_POST", payload : {id : 123, title : "Hello World"}})` itself.
- The only reason we're even writing multiple files is because it's common to separate code by what it does

The ["ducks" file structure](https://github.com/erikras/ducks-modular-redux) proposes putting all of your Redux-related logic for a given slice into a single file, like this:

```js
// postsDuck.js
const CREATE_POST = 'CREATE_POST'
const UPDATE_POST = 'UPDATE_POST'
const DELETE_POST = 'DELETE_POST'

export function addPost(id, title) {
  return {
    type: CREATE_POST,
    payload: { id, title }
  }
}

const initialState = []

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_POST: {
      // Omit actual code
      break
    }
    default:
      return state
  }
}
```

That simplifies things because we don't need to have multiple files, and we can remove the redundant imports of the action type constants. But, we still have to write the action types and the action creators by hand.

### Simplifying Slices with `createSlice`

To simplify this process, Redux Starter Kit includes a `createSlice` function that will auto-generate the action types and action creators for you, based on the names of the reducer functions you provide.

Here's how that posts example would look with `createSlice:

```js
const postsSlice = createSlice({
  initialState: [],
  reducers: {
    createPost(state, action) {},
    updatePost(state, action) {},
    deletePost(state, action) {}
  }
})

console.log(postsSlice)
/*
{
    actions : {
        createPost,
        updatePost,
        deletePost,
    },
    reducer
}
*/

const { createPost } = postsSlice.actions

console.log(createPost({ id: 123, title: 'Hello World' }))
// {type : "createPost", payload : {id : 123, title : "Hello World"}}
```

`createSlice` looked at all of the functions that were defined in the `reducers` field, and for every "case reducer" function provided, generates an action creator that uses the name of the reducer as the action type itself. So, the `createPost` reducer became an action type of `"createPost"`, and the `createPost()` action creator will return an action with that type.

You can also optionally define a `slice` parameter with a string that will be used as the prefix of the action types:

```js
const postsSlice = createSlice({
  slice: 'posts',
  initialState: [],
  reducers: {
    createPost(state, action) {},
    updatePost(state, action) {},
    deletePost(state, action) {}
  }
})

const { createPost } = postsSlice.actions

console.log(createPost({ id: 123, title: 'Hello World' }))
// {type : "posts/createPost", payload : {id : 123, title : "Hello World"}}
```

### Exporting and Using Slices

Most of the time, you'll want to define a slice, and export its action creators and reducers. The recommended way to do this is using ES6 destructuring and export syntax:

```js
const postsSlice = createSlice({
  slice: 'posts',
  initialState: [],
  reducers: {
    createPost(state, action) {},
    updatePost(state, action) {},
    deletePost(state, action) {}
  }
})

// Extract the action creators object and the reducer
const { actions, reducer } = slice
// Extract and export each action creator by name
export const { createPost, updatePost, deletePost } = actions
// Export the reducer, either as a default or named export
export default reducer
```

You could also just export the slice object itself directly if you prefer.

Slices defined this way are very similar in concept to the ["Redux Ducks" pattern](https://github.com/erikras/ducks-modular-redux) for defining and exporting action creators and reducers. However, there are a couple potential downsides to be aware of when importing and exporting slices.

First, **Redux action types are not meant to be exclusive to a single slice**. Conceptually, each slice reducer "owns" its own piece of the Redux state, but it should be able to listen to any action type and update its state appropriately. For example, many different slices might want to respond to a "user logged out" action by clearing data or resetting back to initial state values. Keep that in mind as you design your state shape and create your slices.

Second, **JS modules can have "circular reference" problems if two modules try to import each other**. This can result in imports being undefined, which will likely break the code that needs that import. Specifically in the case of "ducks" or slices, this can occur if slices defined in two different files both want to respond to actions defined in the other file.

This CodeSandbox example demonstrates the problem:

<iframe src="https://codesandbox.io/embed/rw7ppj4z0m" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden; margin-bottom: 20px" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

If you encounter this, you may need to restructure your code in a way that avoids the circular references.
