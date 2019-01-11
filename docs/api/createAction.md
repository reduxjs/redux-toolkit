---
id: createAction
title: createAction
sidebar_label: createAction
hide_title: true
---

# `createAction`

A helper function for defining a Redux [action](https://redux.js.org/basics/actions) type and creator.

```js
function createAction(type)
```

The usual way to define an action in Redux is to separately declare an _action type_ constant and an _action creator_ function for constructing actions of that type.

```js
const INCREMENT = 'counter/increment'

function increment(amount) {
  return {
    type: INCREMENT,
    payload: amount
  }
}

const action = increment(3)
// { type: 'counter/increment', payload: 3 }
```

The `createAction` helper combines these two declarations into one. It takes an action type and returns an action creator for that type. The action creator can be called either without arguments or with a `payload` to be attached to the action. Also, the action creator overrides [toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) so that the action type becomes its string representation.

```js
const increment = createAction('counter/increment')

let action = increment()
// { type: 'counter/increment' }

action = increment(3)
// returns { type: 'counter/increment', payload: 3 }

increment.toString()
// 'counter/increment'

`The action type is: ${increment}`
// 'The action type is: counter/increment'
```

## Usage with createReducer()

Because of their `toString()` override, action creators returned by `createAction()` can be used directly as keys for the case reducers passed to [createReducer()](createReducer.md).

```js
const increment = createAction('counter/increment')
const decrement = createAction('counter/decrement')

const counterReducer = createReducer(0, {
  [increment]: (state, action) => state + action.payload,
  [decrement]: (state, action) => state - action.payload
})
```

This works because object keys that are not natively supported by JavaScript (like, in this case, functions) are implicitly converted to strings, and the action creators’ string representations happen to be the action types they produce.

## Non-String Action Types

In principle, Redux lets you use any kind of value as an action type. Instead of strings, you could theoretically use numbers, [symbols](https://developer.mozilla.org/en-US/docs/Glossary/Symbol), or anything else ([although it's recommended that the value should at least be serializable](https://redux.js.org/faq/actions#why-should-type-be-a-string-or-at-least-serializable-why-should-my-action-types-be-constants)).

However,  `redux-starker-kit` rests on the assumption that you use string action types. Specifically, some of its features rely on the fact that with strings, the `toString()` method of an `createAction()` action creator returns the matching action type. This is not the case for non-string action types because `toString()` will return the string-converted type value rather than the type itself.

```js
const INCREMENT = Symbol('increment')
const increment = createAction(INCREMENT)

increment.toString()
// returns the string 'Symbol(increment)',
// not the INCREMENT symbol itself

increment.toString() === INCREMENT
// false
```

This means that, for instance, you cannot use a non-string-type action creator as a case reducer key for [createReducer()](createReducer.md).

```js
const INCREMENT = Symbol('increment')
const increment = createAction(INCREMENT)

const counterReducer = createReducer(0, {
  // The following case reducer will NOT trigger for
  // increment() actions because `increment` will be
  // interpreted as a string, rather than being evaluated
  // to the INCREMENT symbol.
  [increment]: (state, action) => state + action.payload,

  // You would need to use the action type explicitly instead.
  [INCREMENT]: (state, action) => state + action.payload
})
```

For this reason, **we strongly recommend you to only use string action types**.
