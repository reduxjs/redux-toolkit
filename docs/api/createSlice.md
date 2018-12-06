---
id: createSlice
title: createSlice
sidebar_label: createSlice
hide_title: true
---

# `createSlice`


A function that accepts an initial state, an object full of reducer functions, and optionally a "slice name", and automatically generates action creators, action types, and selectors that correspond to the reducers and state.

The reducers will be wrapped in the [`createReducer()` utility](createReducer.md), and so they can safely "mutate" the state they are given.

```js
import { createSlice } from 'redux-starter-kit'
import { createStore, combineReducers } from 'redux'

const counter = createSlice({
  slice: 'counter', // slice is optional, and could be blank ''
  initialState: 0,
  reducers: {
    increment: state => state + 1,
    decrement: state => state - 1,
    multiply: (state, action) => state * action.payload
  }
})

const user = createSlice({
  slice: 'user',
  initialState: { name: '' },
  reducers: {
    setUserName: (state, action) => {
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
// -> { counter: 2, user: {} }
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