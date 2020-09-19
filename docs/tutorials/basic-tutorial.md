---
id: basic-tutorial
title: Basic Tutorial
sidebar_label: Basic Tutorial
hide_title: true
---

# Basic Tutorial: Introducing Redux Toolkit

Welcome to Redux Toolkit ! This tutorial will show you the basic functions that are included with Redux Toolkit (also known as "RTK" for short).

This tutorial assumes that you are already familiar with the concepts of the core Redux library, as well as how to use it with React. If you aren't, please take some time to read through the [Redux docs](https://redux.js.org) and [React-Redux docs](https://react-redux.js.org) first, as the explanations here focus on how RTK usage differs from "typical" Redux code.

## Introduction: Writing a Counter Application

We'll start by looking at the smallest Redux example: a simple counter application.

### Redux "Counter-Vanilla" Example

The Redux docs have a ["counter-vanilla" example](https://redux.js.org/introduction/examples#counter-vanilla) that shows how to create a simple Redux store with a reducer that stores a single number and responds to `"INCREMENT"` and `"DECREMENT"` action types. You can see the [the complete code as a CodeSandbox here](https://codesandbox.io/s/github/reduxjs/redux/tree/master/examples/counter-vanilla), but here's the important section:

```js
function counter(state, action) {
  if (typeof state === 'undefined') {
    return 0
  }

  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    case 'DECREMENT':
      return state - 1
    default:
      return state
  }
}

var store = Redux.createStore(counter)

document.getElementById('increment').addEventListener('click', function() {
  store.dispatch({ type: 'INCREMENT' })
})
```

This section creates a reducer function called `counter`, ensures it uses a default state value of `0`, listens for `"INCREMENT"` and `"DECREMENT"` action types, and dispatches the `"INCREMENT"` action type when the button is clicked.

### A More Typical Counter Example

While this example is simple, it's also somewhat unrealistic. Most Redux apps are written using ES6 syntax, including default arguments for function parameters that are undefined. It's also common practice to write ["action creator" functions](https://redux.js.org/basics/actions#action-creators) instead of writing the action objects directly in the code, and to write out the action types as constants instead of plain strings each time.

Let's rewrite the above example using those approaches to see what it would look like:

```js
const INCREMENT = 'INCREMENT'
const DECREMENT = 'DECREMENT'

function increment() {
  return { type: INCREMENT }
}

function decrement() {
  return { type: DECREMENT }
}

function counter(state = 0, action) {
  switch (action.type) {
    case INCREMENT:
      return state + 1
    case DECREMENT:
      return state - 1
    default:
      return state
  }
}

const store = Redux.createStore(counter)

document.getElementById('increment').addEventListener('click', () => {
  store.dispatch(increment())
})
```

Since the example is small, that doesn't make too much of a difference in appearance. Size-wise, we saved a couple lines by using a default argument, but writing those action creator functions made things bigger. And, there's some duplication here. Writing `const INCREMENT = 'INCREMENT'` just looks silly :) Especially when it's only being used in two places - the action creator and the reducer.

In addition, switch statements bother many people. It would be nice if we could replace it with some kind of a lookup table instead.

### Introducing: `configureStore`

Redux Toolkit includes several functions to help simplify your Redux code. The first function we'll look at is [`configureStore`](../api/configureStore.mdx).

Normally, you create a Redux store by calling `createStore()` and passing in your root reducer function. Redux Toolkit has a `configureStore()` function that wraps `createStore()` to do the same thing, but also sets up some useful development tools for you as part of the store creation process.

We can easily replace the existing `createStore` call with `configureStore` instead. `configureStore` accepts a single object with named fields, instead of multiple function arguments, so we need to pass our reducer function as a field named `reducer`:

```js
// Before:
const store = createStore(counter)

// After:
const store = configureStore({
  reducer: counter
})
```

This probably doesn't look like much is different. But, under the hood, the store has been configured to enable using the [Redux DevTools Extension](https://github.com/zalmoxisus/redux-devtools-extension) to view the history of dispatched actions and how the store state changed, and has had [some Redux middleware included by default](../api/getDefaultMiddleware.mdx). We'll look at these in more detail in the next tutorial.

### Introducing: `createAction`

Next up, let's look at [`createAction`](../api/createAction.mdx).

`createAction` accepts an action type string as an argument, and returns an action creator function that uses that type string. (Yes, this means the name is a bit incorrect - we're creating an "action creator function", not an "action object", but it's shorter and easier to remember than `createActionCreator`.) So, these two examples are equivalent:

```js
// Original approach: write the action type and action creator by hand
const INCREMENT = 'INCREMENT'

function incrementOriginal() {
  return { type: INCREMENT }
}

console.log(incrementOriginal())
// {type: "INCREMENT"}

// Or, use `createAction` to generate the action creator:
const incrementNew = createAction('INCREMENT')

console.log(incrementNew())
// {type: "INCREMENT"}
```

But what if we need to reference the action type string in a reducer? With `createAction`, you can do that in two ways. First, the action creator's `toString()` method has been overridden, and will return the action type string. Second, the type string is also available as a `.type` field on the function:

```js
const increment = createAction('INCREMENT')

console.log(increment.toString())
// "INCREMENT"

console.log(increment.type)
// "INCREMENT"
```

We can use `createAction` to simplify the previous counter example.

```js
const increment = createAction('INCREMENT')
const decrement = createAction('DECREMENT')

function counter(state = 0, action) {
  switch (action.type) {
    case increment.type:
      return state + 1
    case decrement.type:
      return state - 1
    default:
      return state
  }
}

const store = configureStore({
  reducer: counter
})

document.getElementById('increment').addEventListener('click', () => {
  store.dispatch(increment())
})
```

That saved us a few lines again, and at least we're not repeating the word `INCREMENT` everywhere.

### Introducing: `createReducer`

Now, let's look at the reducer function. While you can use any conditional logic you want in a Redux reducer, including `if` statements and loops, the most common approach is to check the `action.type` field and do some specific logic for each action type. A reducer will also provide an initial state value, and return the existing state if the action isn't something it cares about.

Redux Toolkit includes a [`createReducer` function](../api/createReducer.mdx) that lets you write reducers using a "lookup table" object, where each key in the object is a Redux action type string, and the values are reducer functions. We can use it to directly replace the existing `counter` function definition. Since we need to use the action type strings as the keys, we can use the [ES6 object "computed property" syntax](http://javascript.info/object#computed-properties) to create keys from the type string variables.

```js
const increment = createAction('INCREMENT')
const decrement = createAction('DECREMENT')

const counter = createReducer(0, {
  [increment.type]: state => state + 1,
  [decrement.type]: state => state - 1
})
```

Or, since the computed properties syntax will call `toString()` on whatever variable is inside, we can just use the action creator functions directly without the `.type` field:

```js
const counter = createReducer(0, {
  [increment]: state => state + 1,
  [decrement]: state => state - 1
})
```

To see the complete code so far, see [this CodeSandbox showing the use of `createAction` and `createReducer`](https://codesandbox.io/s/counter-vanilla-redux-toolkit-sjouq).

### Introducing: `createSlice`

Let's review what the counter example looks like at this point:

```js
const increment = createAction('INCREMENT')
const decrement = createAction('DECREMENT')

const counter = createReducer(0, {
  [increment]: state => state + 1,
  [decrement]: state => state - 1
})

const store = configureStore({
  reducer: counter
})

document.getElementById('increment').addEventListener('click', () => {
  store.dispatch(increment())
})
```

That's not bad, but we can make one more major change to this. Why do we even need to generate the action creators separately, or write out those action type strings? The really important part here is the reducer functions.

That's where the [`createSlice` function](../api/createSlice.mdx) comes in. It allows us to provide an object with the reducer functions, and it will automatically generate the action type strings and action creator functions based on the names of the reducers we listed.

`createSlice` returns a "slice" object that contains the generated reducer function as a field named `reducer`, and the generated action creators inside an object called `actions`.

Here's what our counter example would look like using `createSlice` instead:

```js
const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: state => state + 1,
    decrement: state => state - 1
  }
})

const store = configureStore({
  reducer: counterSlice.reducer
})

document.getElementById('increment').addEventListener('click', () => {
  store.dispatch(counterSlice.actions.increment())
})
```

Most of the time, you'll probably want to use ES6 destructuring syntax to pull out the action creator functions as variables, and possibly the reducer as well:

```js
const { actions, reducer } = counterSlice
const { increment, decrement } = actions
```

## Summary

Let's recap what the functions do:

- `configureStore`: creates a Redux store instance like the original `createStore` from Redux, but accepts a named options object and sets up the Redux DevTools Extension automatically
- `createAction`: accepts an action type string, and returns an action creator function that uses that type
- `createReducer`: accepts an initial state value and a lookup table of action types to reducer functions, and creates a reducer that handles all of those action types
- `createSlice`: accepts an initial state and a lookup table with reducer names and functions, and automatically generates action creator functions, action type strings, and a reducer function.

Notice that none of these changed anything about how Redux works. We're still creating a Redux store, dispatching action objects that describe "what happened", and returning updated state using a reducer function. Also, notice that the Redux Toolkit functions can be used no matter what approach was used to build the UI, since they just handle the "plain Redux store" part of the code. Our example used the store with a "vanilla JS" UI, but we could use this same store with React, Angular, Vue, or any other UI layer.

Finally, if you look carefully at the example, you'll see that there's one place where we've written some async logic - the "increment async" button:

```js
document.getElementById('incrementAsync').addEventListener('click', function() {
  setTimeout(function() {
    store.dispatch(increment())
  }, 1000)
})
```

You can see that we're keeping the async handling separate from the reducer logic, and we dispatch an action when the store needs to be updated. Redux Toolkit doesn't change anything about that.

Here's the complete example in a sandbox:

<iframe src="https://codesandbox.io/embed/counter-vanilla-createslice-redux-toolkit-6gkxx?fontsize=14&hidenavigation=1&theme=dark&view=editor"
     style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }} 
     title="counter-vanilla createSlice - Redux Toolkit"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

Now that you know the basics of each function, the next step is to try using them in a _slightly_ larger example to see more of how they work. We'll cover that in the [Intermediate Tutorial](./intermediate-tutorial.md).
