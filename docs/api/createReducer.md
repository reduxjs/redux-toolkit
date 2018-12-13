---
id: createReducer
title: createReducer
sidebar_label: createReducer
hide_title: true
---

# `createReducer`

A utility function to create reducers that handle specific action types, similar to the example function in the ["Reducing Boilerplate" Redux docs page](https://redux.js.org/recipes/reducing-boilerplate#generating-reducers). Takes an initial state value and an object that maps action types to case reducer functions. Internally, it uses the [`immer` library](https://github.com/mweststrate/immer), so you can write code in your case reducers that mutates the existing `state` value, and it will correctly generate immutably-updated state values instead.

```ts
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
  // Updates the todo object immutably without relying on immer
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
