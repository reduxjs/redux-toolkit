---
id: intermediate-tutorial
title: Intermediate Tutorial
sidebar_label: Intermediate Tutorial
hide_title: true
---

# Intermediate Tutorial: Redux Starter Kit in Action

In the [Basic Tutorial](./basic-tutorial.md), you saw the main API functions that are included in Redux Starter Kit, and some short examples of why and how to use them.  You also saw that you can use Redux and RSK from a plain JS script tag in an HTML page, without using React, NPM, Webpack, or any build tools.

In this tutorial, you'll see how to use those APIs in a small React app.  Specifically, we're going to convert the [original Redux "todos" example app](https://redux.js.org/introduction/examples#todos) to use RSK instead.

This will show several several concepts:

- How to convert "plain Redux" code to use RSK
- How to use RSK in a typical React+Redux app
- How some of the more powerful features of RSK can be used to simplify your Redux code

Also, while this isn't specific to RSK, we'll look at a couple ways you can improve your React-Redux code as well.

The complete source code for the converted application from this tutorial is available at [github.com/markerikson/rsk-convert-todos-example](https://github.com/markerikson/rsk-convert-todos-example).  We'll be walking through the conversion process as shown in this repo's history.


## Reviewing the Redux Todos Example

If we inspect [the current "todos" example source code](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src), we can observe a few things:

- The [`todos` reducer function](https://github.com/reduxjs/redux/blob/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/reducers/todos.js) is doing immutable updates "by hand", by copying nested JS objects and arrays
- The [`actions` file](https://github.com/reduxjs/redux/blob/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/actions/index.js) has hand-written action creator functions, and the action type strings are being duplicated between the actions file and the reducer files
- The code is laid out using a ["folder-by-type" structure](https://redux.js.org/faq/code-structure#what-should-my-file-structure-look-like-how-should-i-group-my-action-creators-and-reducers-in-my-project-where-should-my-selectors-go), with separate files for `actions` and `reducers`
- The React components are written using a strict version of the "container/presentational" pattern, where [the "presentational" components are in one folder](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/components), and the [Redux "container" connection definitions are in a different folder](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/containers)
- Some of the code isn't following some of the recommended Redux "best practices" patterns.  We'll look at some specific examples as we go through this tutorial.

On the one hand, this is a small example app.  It's meant to illustrate the basics of actually using React and Redux together, and not necessarily be used as "the right way" to do things in a full-scale production application.  On the other hand, most people will use patterns they see in docs and examples, and there's definitely room for improvement here.


## Initial Conversion Steps

### Adding Redux Starter Kit to the Project

I started by copying the Redux "todos" source code to a fresh Create-React-App project, and added Prettier to the project to help make sure the code is formatted consistently.  I've also added a `jsconfig.json` file to enable us to use "absolute import paths" that start from the `/src` folder.  You can see [the initial commit here]().

In the Basic Tutorial, we just linked to Redux Starter Kit as an individual script tag.  But, in a typical application, you need to add RSK as a package dependency in your project.  This can be done with either the NPM or Yarn package managers:

```bash
# If you're using NPM:
npm install redux-starter-kit

# Or for Yarn:
yarn add redux-starter-kit
```

Once that's complete, you should add and commit the modified `package.json` file and the "lock file" from your package manager (`package-lock.json` for NPM, or `yarn.lock` for Yarn).

With that done, we can start to work on the code.

### Converting the Store to Use `configureStore`

Just like with the "counter" example, we can replace the plain Redux `createStore` function with RSK's `configureStore`.  This will automatically set up the Redux DevTools Extension for us.

The changes here are simple.  We update `src/index.js` to import `configureStore` instead of `createStore`, and replace the function call.  Remember that `configureStore` takes an options object as a parameter with named fields, so instead of passing `rootReducer` directly as the first parameter, we pass it as an object field named `reducer`:

```diff
import React from "react";
import { render } from "react-dom";
-import { createStore } from "redux";
+import { configureStore } from "redux-starter-kit";
import { Provider } from "react-redux";
import App from "./components/App";
import rootReducer from "./reducers";

-const store = createStore(rootReducer);
+const store = configureStore({
+   reducer: rootReducer,
+});
```

Note that we're still using the same root reducer function that's already in the application, and a Redux store is still being created.  All that's changed is the store is automatically set up with tools to aid you in development.

If you have [the Redux DevTools browser extension](https://github.com/zalmoxisus/redux-devtools-extension) installed, you should now be able to see the current state if you start the application in development mode and open the DevTools Extension.  It should look like this:

![01-redux-devtools-extension](assets/tutorials/intermediate/int-tut-01-redux-devtools.png)



## Creating a Todos Slice

The first big step for rewriting the app is to convert the todos logic into a new "slice".

### Understanding Slices

Right now, the todos code is split into two parts.  The reducer logic is in `reducers/todos.js`, while the action creators are in `actions/index.js`.  In a larger app, we might even see the action type constants in their own file, like `constants/todos.js`, so they can be reused in both places.

We _could_ replace those using RSK's [`createReducer`](../api/createReducer.md) and [`createAction`](../api/createAction.md) functions.  However, the RSK [`createSlice` function](../api/createSlice.md) allows us to consolidate that logic in one place.  It uses `createReducer` and `createAction` internally, so in most apps, you won't need to use them yourself - `createSlice` is all you need.

You may be wondering, "what is a 'slice', anyway?".  A normal Redux application has a JS object at the top of its state tree, and that object is the result of calling the Redux [`combineReducers` function](https://redux.js.org/api/combinereducers) to join multiple reducer functions into one larger "root reducer".  We refer to one key/value section of that object as a "slice", and we use the term ["slice reducer"](https://redux.js.org/recipes/structuring-reducers/splitting-reducer-logic) to describe the reducer function responsible for updating that slice of the state.

In this app, the root reducer looks like:

```js
import todos from './todos'
import visibilityFilter from './visibilityFilter'

export default combineReducers({
  todos,
  visibilityFilter
})
```

So, the combined state looks like `{todos: [], visibilityFilter: "SHOW_ALL"}`.  `state.todos` is a "slice", and the `todos` reducer function is a "slice reducer".


### Examining the Original Todos Reducer

The original todos reducer logic looks like this:

```js
const todos = (state = [], action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return [
        ...state,
        {
          id: action.id,
          text: action.text,
          completed: false
        }
      ]
    case 'TOGGLE_TODO':
      return state.map(todo =>
        todo.id === action.id ? { ...todo, completed: !todo.completed } : todo
      )
    default:
      return state
  }
}

export default todos
```

We can see that it handles three cases:

- It adds a new todo by copying the existing `state` array and adding a new todo entry at the end
- It handles toggling a todo entry by copying the existing array use `state.map()`, copies and replaces the todo object that needs to be updated, and leaves all other todo entries alone.
- It responds to all other actions by returning the existing state (effectively saying "I don't care about that action").

It also initializes the state with a default value of `[]`, and does a default export of the reducer function.


### Writing the Slice Reducer

We can do the same work with `createSlice`, but we can do it in a simpler way.

We'll start by adding a new file called `/features/todos/todosSlice.js`.  Note that while it doesn't matter how you actually structure your folders and files, we've found that [a "feature folder" approach](https://redux.js.org/faq/code-structure#what-should-my-file-structure-look-like-how-should-i-group-my-action-creators-and-reducers-in-my-project-where-should-my-selectors-go) usually works better for most applications.


In this file, we'll add the following logic:

```js
import { createSlice } from 'redux-starter-kit'

const todosSlice = createSlice({
  slice: 'todos',
  initialState: [],
  reducers: {
    addTodo(state, action) {
      const { id, text } = action.payload
      state.push({ id, text, completed: false })
    },
    toggleTodo(state, action) {
      const todo = state.find(todo => todo.id === action.payload.id)
      if (todo) {
        todo.completed = !todo.completed
      }
    }
  }
})

export const { addTodo, toggleTodo } = todosSlice.actions

export default todosSlice.reducer
```

#### `createSlice` Options

Let's break down what this does:

- `createSlice` takes an options object as its argument, with these options:
    - `slice`: a string that is used as the prefix for generated action types
    - `initialState`: the initial state value for the reducer
    - `reducers`: an object, where the keys will become action type strings, and the functions are reducers that will be run when that action type is dispatched.  (These are sometimes referred to as ["case reducers"](https://redux.js.org/recipes/structuring-reducers/splitting-reducer-logic), because they're similar to a `case` in a `switch` statement)

So, the `addTodo` case reducer function will be run when an action with the type `"todos/addTodo"` is dispatched.


#### "Mutable" Update Logic

Notice that the `addTodo` reducer is calling `state.push()`.  Normally, this is bad, because [the `array.push()` function mutates the existing array](https://doesitmutate.xyz/#push), and [Redux reducers must _never_ mutate state!](https://redux.js.org/basics/reducers#handling-actions).

However, `createSlice` and `createReducer` wrap your function with [`produce` from the Immer library](https://github.com/immerjs/immer).  This means you can write code that "mutates" the state inside the reducer, and Immer will safely return a correct immutably updated result.

Similarly, `toggleTodo` doesn't map over the array or copy the matching todo object.  Instead, it just finds the matching todo object, and then mutates it by assigning `todo.completed = !todo.completed`.  Again, Immer knows this object was updated, and makes copies of both the todo object and the containing array.

Normal immutable update logic tends to obscure what you're actually trying to do because of all of the extra copying that has to happen.  Here, the intent should be much more clear: we're adding an item to the end of an array, and we're modifying a field in a todo entry.

#### Exporting the Slice Functions

`createSlice` returns an object that looks like this:

```js
{
    reducer: (state, action) => newState,
    actions: {
        addTodo: (payload) => ({type: "todos/addTodo", payload}),
        toggleTodo: (payload) => ({type: "todos/toggleTodo", payload})
    }
}
```

Notice that it auto-generated the appropriate action creator functions _and_ action types for each of our reducers - we don't have to write those by hand!

We'll need to use the action creators and the reducer in other files, so at a minimum we would need to export the slice object.  However, we can use a Redux community code convention called [the "ducks" pattern](https://github.com/erikras/ducks-modular-redux).  Simply put, it suggests you put all your action creators and reducers in one file, do named exports of the action creators, and a default export of the reducer function.

Thanks to `createSlice`, we already have our action creators and the reducer right here in one file.  All we have to do is export them separately, and our todos slice file now matches the common "ducks" pattern.


#### Working with Action Payloads

Speaking of the action creators, let's go back and re-examine the reducer logic for a minute.

By default, the action creators from the RSK `createAction` function only accept one argument.  That argument, whatever it is, is put into the action object as a field called `payload`.

There's nothing special about the field `action.payload` by itself.  Redux doesn't know or care about that name.  But, like "ducks", the name `payload` comes from another Redux community convention called ["Flux Standard Actions"](https://github.com/redux-utilities/flux-standard-action).  

Actions usually need to include some extra data along with the `type` field.  The original Redux code for `addTodo` has an action object that looks like `{type, id, text}`.  The FSA convention suggests that rather than having data fields with random names directly in the action object, you should always put your data inside a field named `payload`.  


It's up to the reducer to establish what it thinks `payload` should be for each action type, and whatever code dispatches the action needs to pass in values that match that expectation.  If you have one only value, you could potentially use that as the whole `payload` value directly.  More commonly, you'd need to pass in multiple values, in which case `payload` should be an object.

In our todos slice, `addTodo` needs two fields, `id`, and `text`, so we put those into an object as `payload`.  For `toggleTodo`, the only value we need is the `id` of the todo being changed.  We could have made that the `payload`, but I prefer always having `payload` be an object, so I made it `action.payload.id` instead.

(As a sneak peek: there _is_ a way to customize how action object payloads are created.  We'll look at that later in this tutorial, or you can look through [the `createAction` API docs](../api/createAction.md) for an explanation.)



# TODO:

- prepare callbacks
- all the other code I haven't even gotten to yet