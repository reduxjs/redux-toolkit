---
id: createAction
title: createAction
sidebar_label: createAction
hide_title: true
---

# `createAction`

A helper function for defining a Redux [action](https://redux.js.org/basics/actions) type and creator.

```js
function createAction(type, prepareAction?)
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

console.log(increment.toString())
// 'counter/increment'

console.log(`The action type is: ${increment}`)
// 'The action type is: counter/increment'
```

## Using Prepare Callbacks to Customize Action Contents

By default, the generated action creators accept a single argument, which becomes `action.payload`. This requires the caller to construct the entire payload correctly and pass it in.

In many cases, you may want to write additional logic to customize the creation of the `payload` value, such as accepting multiple parameters for the action creator, generating a random ID, or getting the current timestamp. To do this, `createAction` accepts an optional second argument: a "prepare callback" that will be used to construct the payload value.

```js
import v4 from 'uuid/v4'

const addTodo = createAction('todos/add', function prepare(text) {
  return {
    payload: {
      text,
      id: v4(),
      createdAt: new Date().toISOString()
    }
  }
})

console.log(addTodo('Write more docs'))
/**
 * {
 *   type: 'todos/add',
 *   payload: {
 *     text: 'Write more docs',
 *     id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
 *     createdAt: '2019-10-03T07:53:36.581Z'
 *   }
 * }
 **/
```

If provided, all arguments from the action creator will be passed to the prepare callback, and it should return an object with the `payload` field (otherwise the payload of created actions will be `undefined`). Additionally, the object can have a `meta` field that will also be added to created actions. This may contain extra information about the action. These two fields (`payload` and `meta`) adhere to the specification of [Flux Standard Actions](https://github.com/redux-utilities/flux-standard-action#actions).

**Note:** The type field will be added automatically.

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

However, Redux Starter Kit rests on the assumption that you use string action types. Specifically, some of its features rely on the fact that with strings, the `toString()` method of an `createAction()` action creator returns the matching action type. This is not the case for non-string action types because `toString()` will return the string-converted type value rather than the type itself.

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
