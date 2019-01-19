---
id: createAction
title: createAction
sidebar_label: createAction
hide_title: true
---

# `createAction`

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
    // action creator's `toString()` can be used as the type for comparisons
    case increment.toString(): {
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
