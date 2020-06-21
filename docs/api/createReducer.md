---
id: createReducer
title: createReducer
sidebar_label: createReducer
hide_title: true
---

# `createReducer()`

## Overview

A utility that simplifies creating Redux reducer functions, by defining them as lookup tables of functions to handle each action type. It also allows you to drastically simplify immutable update logic, by writing "mutative" code inside your reducers.

Redux [reducers](https://redux.js.org/basics/reducers) are often implemented using a `switch` statement, with one `case` for every handled action type.

```js
function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'increment':
      return state + action.payload
    case 'decrement':
      return state - action.payload
    default:
      return state
  }
}
```

This approach works well, but is a bit boilerplate-y and error-prone. For instance, it is easy to forget the `default` case or setting the initial state.The `createReducer` helper streamlines the implementation of such reducers.

## Parameters

`createReducer` accepts four possible parameters, with the first two required.

### `initialState`

The initial state that should be used when the reducer is called the first time.

### `caseReducers`

An object mapping from action types to _case reducers_, each of which handles one specific action type.

```js
const counterReducer = createReducer(0, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
})
```

Action creators that were generated using [`createAction`](./createAction.md) may be used directly as the keys here, using
computed property syntax:

```js
const increment = createAction('increment')
const decrement = createAction('decrement')

const counterReducer = createReducer(0, {
  [increment]: (state, action) => state + action.payload,
  [decrement.type]: (state, action) => state - action.payload
})
```

Alternately, the second argument may be a "builder callback" function that can be used to add case handlers for specific action types, match against a range of action types, or provide a fallback default case if no other actions matched:

```js
const initialState = {
  counter: 0,
  rejectedActions: 0,
  unhandledActions: 0
}

const exampleReducer = createReducer(initialState, builder => {
  builder
    .addCase('counter', state => {
      state.counter++
    })
    .addMatcher(
      action => action.endsWith('/rejected'),
      (state, action) => {
        state.rejectedActions++
      }
    )
    .addDefaultCase((state, action) => {
      state.unhandledActions++
    })
})
```

See [the `builder callback` API](#the-builder-callback-api) below for details on defining reducers using this syntax.

> **Note**: If you are using TypeScript, we specifically recommend using the builder callback API to get proper inference of TS types for action objects. If you do not use the builder callback and are using TypeScript, you will need to use `actionCreator.type` or `actionCreator.toString()` as the key to force the TS compiler to accept the computed property. Please see [Usage With TypeScript](./../usage/usage-with-typescript.md#type-safety-with-extraReducers) for further details.

### `actionMatchers`

An optional array of objects that include a `matcher` function to determine if an action should be handled, and a `reducer` function that updates the state. This argument will be ignored if the second argument is a builder callback.

### `defaultCase`

A reducer that will be run if no other case reducers or matchers handle a given action. This argument will be ignored if the second argument is a builder callback.

## Direct State Mutation

Redux requires reducer functions to be pure and treat state values as immutable. While this is essential for making state updates predictable and observable, it can sometimes make the implementation of such updates awkward. Consider the following example:

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducer([], {
  [addTodo]: (state, action) => {
    const todo = action.payload
    return [...state, todo]
  },
  [toggleTodo]: (state, action) => {
    const index = action.payload
    const todo = state[index]
    return [
      ...state.slice(0, index),
      { ...todo, completed: !todo.completed }
      ...state.slice(index + 1)
    ]
  }
})
```

The `addTodo` reducer is straightforward if you know the [ES6 spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax). However, the code for `toggleTodo` is much less straightforward, especially considering that it only sets a single flag.

To make things easier, `createReducer` uses [immer](https://github.com/mweststrate/immer) to let you write reducers as if they were mutating the state directly. In reality, the reducer receives a proxy state that translates all mutations into equivalent copy operations.

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducer([], {
  [addTodo]: (state, action) => {
    // This push() operation gets translated into the same
    // extended-array creation as in the previous example.
    const todo = action.payload
    state.push(todo)
  },
  [toggleTodo]: (state, action) => {
    // The "mutating" version of this case reducer is much
    //  more direct than the explicitly pure one.
    const index = action.payload
    const todo = state[index]
    todo.completed = !todo.completed
  }
})
```

Writing "mutating" reducers simplifies the code. It's shorter, there's less indirection, and it eliminates common mistakes made while spreading nested state. However, the use of Immer does add some "magic", and Immer has its own nuances in behavior. You should read through [pitfalls mentioned in the immer docs](https://immerjs.github.io/immer/docs/pitfalls) . Most importantly, **you need to ensure that you either mutate the `state` argument or return a new state, _but not both_**. For example, the following reducer would throw an exception if a `toggleTodo` action is passed:

```js
const todosReducer = createReducer([], {
  [toggleTodo]: (state, action) => {
    const index = action.payload
    const todo = state[index]

    // This case reducer both mutates the passed-in state...
    todo.completed = !todo.completed

    // ... and returns a new value. This will throw an
    // exception. In this example, the easiest fix is
    // to remove the `return` statement.
    return [...state.slice(0, index), todo, ...state.slice(index + 1)]
  }
})
```

## The "builder callback" API

Instead of using a plain object as an argument to `createReducer`, you can also provide a "builder callback" function that receives an `ActionReducerMapBuilder` instance:

```typescript
const increment = createAction('increment')
const decrement = createAction('decrement')
createReducer(0, builder =>
  builder
    .addCase(increment, (state, action) => {
      // action is inferred correctly here
    })
    // You can chain calls, or have separate `builder.addCase()` lines each time
    .addCase(decrement, (state, action) => {})
    // You can match a range of action types
    .addMatcher(
      action => action.endsWith('rejected'),
      (state, action) => {}
    )
    // and provide a default case if no other handlers matched
    .addDefaultCase((state, action) => {})
)
```

While the object syntax is shorter, the builder callback syntax allows adding multiple forms of reducers. It also provides better type inference, as passing a plain object full of reducer functions cannot infer their types correctly in this case.

We recommend using this API if stricter type safety is necessary when defining reducer argument objects.

### `builder.addCase`

Adds a case reducer to handle a single exact action type. The first argument may be either a plain action type string, or an action creator generated by [`createAction`](./createAction.md) that can be used to determine the action type. The second argument is the actual case reducer function.

All calls to `builder.addCase` must come before any calls to `builder.addMatcher` or `builder.addDefaultCase`.

### `builder.addMatcher`

`builder.addMatcher` allows you to match your reducer against your own filter function instead of only the `action.type` property.
This allows for a lot of generic behaviour, so you could for example write a "generic loading tracker" state based on an approach like this:

```js
const initialState = {}
const resetAction = createAction('reset-tracked-loading-state')
const reducer = createReducer(initialState, builder => {
  builder
    .addCase(resetAction, () => initialState)
    .addMatcher(
      action => action.type.endsWith('/pending') && 'requestId' in action.meta,
      (state, action) => {
        state[action.meta.requestId] = 'pending'
      }
    )
    .addMatcher(
      action => action.type.endsWith('/rejected') && 'requestId' in action.meta,
      (state, action) => {
        state[action.meta.requestId] = 'rejected'
      }
    )
    .addMatcher(
      action =>
        action.type.endsWith('/fulfilled') && 'requestId' in action.meta,
      (state, action) => {
        state[action.meta.requestId] = 'fulfilled'
      }
    )
})
```

Note that _all_ matching matcher reducers will execute in order, even if a case reducer has already executed.

### `builder.addDefaultCase`

`builder.addDefaultCase` allows you to add a "default" reducer that will execute if no case reducer or matcher reducer was executed.

```js
const reducer = createReducer(initialState, builder => {
  builder
    // .addCase
    // ...
    // .addMatcher
    // ...
    .addDefaultCase((state, action) => {
      state.otherActions++
    })
})
```

### Matchers and Default Cases as Arguments

The most readable approach to define matcher cases and default cases is by using the `builder.addMatcher` and `builder.addDefaultCase` methods described above, but it is also possible to use these with the object notation by passing an array of `{matcher, reducer}` objects as the third argument, and a default case reducer as the fourth argument:

```js
const isStringPayloadAction = action => typeof action.payload === 'string'

const lengthOfAllStringsReducer = createReducer(
  // initial state
  { strLen: 0, nonStringActions: 0 },
  // normal reducers
  {
    /*...*/
  },
  //  array of matcher reducers
  [
    {
      matcher: isStringPayloadAction,
      reducer(state, action) {
        state.strLen += action.payload.length
      }
    }
  ],
  // default reducer
  state => {
    state.nonStringActions++
  }
)
```

## Multiple Case Reducer Execution

Originally, `createReducer` always matched a given action type to a single case reducer, and only that one case reducer would execute for a given action.

The action matcher support changes that behavior, as multiple matchers may handle a single action.

For any dispatched action, the behavior is:

- If there is an exact match for the action type, the corresponding case reducer will execute first
- Any matchers that return `true` will execute in the order they were defined
- If a default case reducer is provided, and _no_ case or matcher reducers ran, the default case reducer will execute
- If no case or matcher reducers ran, the original existing state value will be returned unchanged

The executing reducers form a pipeline, and each of them will receive the output of the previous reducer:

```js
const reducer = createReducer(0, builder => {
  builder
    .addCase('increment', state => state + 1)
    .addMatcher(
      action => action.type.startsWith('i'),
      state => state * 5
    )
    .addMatcher(
      action => action.type.endsWith('t'),
      state => state + 2
    )
})

console.log(reducer(0, { type: 'increment' }))
// Returns 7, as the 'increment' case and both matchers all ran in sequence:
// - case 'increment": 0 => 1
// - matcher starts with 'i': 1 => 5
// - matcher ends with 't': 5 => 7
```

## Debugging your state

It's very common for a developer to call `console.log(state)` during the development process. However, browsers display Proxies in a format that is hard to read, which can make console logging of Immer-based state difficult.

When using either `createSlice` or `createReducer`, you may use the [`current`](./otherExports#current.md) utility that we re-export from the [`immer` library](https://immerjs.github.io/immer/docs/current). This utility creates a separate plain copy of the current Immer `Draft` state value, which can then be logged for viewing as normal.

```ts
// todosSlice.js
import { createSlice, current } from '@reduxjs/toolkit'

const slice = createSlice({
  name: 'todos',
  initialState: [{ id: 1, title: 'Example todo' }],
  reducers: {
    addTodo: (state, action) => {
      console.log('before', current(state))
      state.push(action.payload)
      console.log('after', current(state))
    }
  }
})
```
