---
id: createSlice
title: createSlice
sidebar_label: createSlice
hide_title: true
---

# `createSlice`

A function that accepts an initial state, an object full of reducer functions, and optionally a "slice name", and automatically generates action creators, action types, and selectors that correspond to the reducers and state.

## Parameters

`createSlice` accepts a single configuration object parameter, with the following options:

```ts
function createSlice({
    // An object of "case reducers". Key names will be used to generate actions.
    reducers: Object<string, ReducerFunction>
    // The initial state for the reducer
    initialState: any,
    // An optional name, used in action types and selectors
    slice?: string,
})
```

### `reducers`

An object containing Redux "case reducer" functions (functions intended to handle a specific action type, equivalent
to a single case statement in a switch).

The keys in the object will be used to generate string action type constants, and these will show up in the Redux
DevTools Extension when they are dispatched. Also, if any other part of the application happens to dispatch an action
with the exact same type string, the corresponding reducer will be run. Therefore, you should give the functions
descriptive names.

This object will be passed to [`createReducer`](./createReducer.md), so the reducers may safely "mutate" the
state they are given.

### `initialState`

The initial state value for this slice of state.

### `slice`

An optional string name for this slice of state.

The slice name is used in two ways.

First, if provided, generated action type constants will use this as a prefix.

Second, it affects the name and behavior of the generated selector. If provided, a selector named after the slice
will be generated. This selector assume the slice data exists in an object, with the slice name as the key, and will
return the value at that key name. If not provided, a selector named `getState` will be generated that just returns
its argument.


## Return Value

`createSlice` will return an object that looks like:

```ts
{
    slice : string,
    reducer : ReducerFunction,
    actions : Object<string, ActionCreator},
    selectors : Object<string, Selector>
}
```

Each function defined in the `reducers` argument will have a corresponding action creator generated using [`createAction`](./createAction.md)
and included in the result's `actions` field using the same function name.

The generated `reducer` function is suitable for passing to the Redux `combineReducers` function as a "slice reducer".

The generated selector function will be available in the result's `selectors` field.

You may want to consider destructuring the action creators and exporting them individually, for ease of searching
for references in a larger codebase.

> **Note**: the result object is conceptually similar to a
> ["Redux duck" code structure](https://redux.js.org/faq/code-structure#what-should-my-file-structure-look-like-how-should-i-group-my-action-creators-and-reducers-in-my-project-where-should-my-selectors-go).
> The actual code structure you use is up to you, but there are a couple caveats to keep in mind:
>
> - Actions are not exclusively limited to a single slice. Any part of the reducer logic can (and should!) respond
>   to any dispatched action.
> - At the same time, circular references can cause import problems. If slices A and B are defined in
>   separate files, and each file tries to import the other so it can listen to other actions, unexpected
>   behavior may occur.


## Examples

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
