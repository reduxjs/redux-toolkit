---
id: immer-reducers
title: Writing Reducers with Immer
sidebar_label: Writing Reducers with Immer
hide_title: true
---

&nbsp;

# Writing Reducers with Immer

Redux Toolkit's [`createReducer`](../api/createReducer.mdx) and [`createSlice`](../api/createSlice.mdx) automatically use [Immer](https://immerjs.github.io/immer/) internally to let you write simpler immutable update logic using "mutating" syntax. This helps simplify most reducer implementations.

Because Immer is itself an abstraction layer, it's important to understand why Redux Toolkit uses Immer, and how to use it correctly.

## Immutability and Redux

### Basics of Immutability

"Mutable" means "changeable". If something is "immutable", it can never be changed.

JavaScript objects and arrays are all mutable by default. If I create an object, I can change the contents of its fields. If I create an array, I can change the contents as well:

```js
const obj = { a: 1, b: 2 }
// still the same object outside, but the contents have changed
obj.b = 3

const arr = ['a', 'b']
// In the same way, we can change the contents of this array
arr.push('c')
arr[1] = 'd'
```

This is called _mutating_ the object or array. It's the same object or array reference in memory, but now the contents inside the object have changed.

**In order to update values immutably, your code must make _copies_ of existing objects/arrays, and then modify the copies**.

We can do this by hand using JavaScript's array / object spread operators, as well as array methods that return new copies of the array instead of mutating the original array:

```js
const obj = {
  a: {
    // To safely update obj.a.c, we have to copy each piece
    c: 3,
  },
  b: 2,
}

const obj2 = {
  // copy obj
  ...obj,
  // overwrite a
  a: {
    // copy obj.a
    ...obj.a,
    // overwrite c
    c: 42,
  },
}

const arr = ['a', 'b']
// Create a new copy of arr, with "c" appended to the end
const arr2 = arr.concat('c')

// or, we can make a copy of the original array:
const arr3 = arr.slice()
// and mutate the copy:
arr3.push('c')
```

:::info Want to Know More?

For more info on how immutability works in JavaScript, see:

- [A Visual Guide to References in JavaScript](https://daveceddia.com/javascript-references/)
- [Immutability in React and Redux: The Complete Guide](https://daveceddia.com/react-redux-immutability-guide/)

:::

### Reducers and Immutable Updates

One of the primary rules of Redux is that **our reducers are _never_ allowed to mutate the original / current state values!**

:::warning

```js
// ❌ Illegal - by default, this will mutate the state!
state.value = 123
```

:::

There are several reasons why you must not mutate state in Redux:

- It causes bugs, such as the UI not updating properly to show the latest values
- It makes it harder to understand why and how the state has been updated
- It makes it harder to write tests
- It breaks the ability to use "time-travel debugging" correctly
- It goes against the intended spirit and usage patterns for Redux

So if we can't change the originals, how do we return an updated state?

:::tip

**Reducers can only make _copies_ of the original values, and then they can mutate the copies.**

```js
// ✅ This is safe, because we made a copy
return {
  ...state,
  value: 123,
}
```

:::

We already saw that we can write immutable updates by hand, by using JavaScript's array / object spread operators and other functions that return copies of the original values.

This becomes harder when the data is nested. **A critical rule of immutable updates is that you must make a copy of _every_ level of nesting that needs to be updated.**

A typical example of this might look like:

```js
function handwrittenReducer(state, action) {
  return {
    ...state,
    first: {
      ...state.first,
      second: {
        ...state.first.second,
        [action.someId]: {
          ...state.first.second[action.someId],
          fourth: action.someValue,
        },
      },
    },
  }
}
```

However, if you're thinking that "writing immutable updates by hand this way looks hard to remember and do correctly"... yeah, you're right! :)

Writing immutable update logic by hand _is_ hard, and **accidentally mutating state in reducers is the single most common mistake Redux users make**.

## Immutable Updates with Immer

[Immer](https://immerjs.github.io/immer/) is a library that simplifies the process of writing immutable update logic.

Immer provides a function called `produce`, which accepts two arguments: your original `state`, and a callback function. The callback function is given a "draft" version of that state, and inside the callback, it is safe to write code that mutates the draft value. Immer tracks all attempts to mutate the draft value and then replays those mutations using their immutable equivalents to create a safe, immutably updated result:

```js
import produce from 'immer'

const baseState = [
  {
    todo: 'Learn typescript',
    done: true,
  },
  {
    todo: 'Try immer',
    done: false,
  },
]

const nextState = produce(baseState, (draftState) => {
  // "mutate" the draft array
  draftState.push({ todo: 'Tweet about it' })
  // "mutate" the nested state
  draftState[1].done = true
})

console.log(baseState === nextState)
// false - the array was copied
console.log(baseState[0] === nextState[0])
// true - the first item was unchanged, so same reference
console.log(baseState[1] === nextState[1])
// false - the second item was copied and updated
```

### Redux Toolkit and Immer

Redux Toolkit's [`createReducer` API](../api/createReducer.mdx) uses Immer internally automatically. So, it's already safe to "mutate" state inside of any case reducer function that is passed to `createReducer`:

```js
const todosReducer = createReducer([], (builder) => {
  builder.addCase('todos/todoAdded', (state, action) => {
    // "mutate" the array by calling push()
    state.push(action.payload)
  })
})
```

In turn, `createSlice` uses `createReducer` inside, so it's also safe to "mutate" state there as well:

```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    todoAdded(state, action) {
      state.push(action.payload)
    },
  },
})
```

This even applies if the case reducer functions are defined outside of the `createSlice/createReducer` call. For example, you could have a reusable case reducer function that expects to "mutate" its state, and include it as needed:

```js
const addItemToArray = (state, action) => {
  state.push(action.payload)
}

const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    todoAdded: addItemToArray,
  },
})
```

This works because the "mutating" logic is wrapped in Immer's `produce` method internally when it executes.

:::caution

Remember, **the "mutating" logic _only_ works correctly when wrapped inside of Immer!** Otherwise, that code _will_ really mutate the data.

:::

## Immer Usage Patterns

There are several useful patterns to know about and gotchas to watch out for when using Immer in Redux Toolkit.

### Mutating and Returning State

Immer works by tracking attempts to mutate an existing drafted state value, either by assigning to nested fields or by calling functions that mutate the value. That means that **the `state` must be a JS object or array in order for Immer to see the attempted changes**. (You can still have a slice's state be a primitive like a string or a boolean, but since primitives can never be mutated anyway, all you can do is just return a new value.)

In any given case reducer, **Immer expects that you will either _mutate_ the existing state, _or_ construct a new state value yourself and return it, but _not_ both in the same function!** For example, both of these are valid reducers with Immer:

```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    todoAdded(state, action) {
      // "Mutate" the existing state, no return value needed
      state.push(action.payload)
    },
    todoDeleted(state, action.payload) {
      // Construct a new result array immutably and return it
      return state.filter(todo => todo.id !== action.payload)
    }
  }
})
```

However, it _is_ possible to use immutable updates to do part of the work and then save the results via a "mutation". An example of this might be filtering a nested array:

```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: {todos: [], status: 'idle'}
  reducers: {
    todoDeleted(state, action.payload) {
      // Construct a new array immutably
      const newTodos = state.todos.filter(todo => todo.id !== action.payload)
      // "Mutate" the existing state to save the new array
      state.todos = newTodos
    }
  }
})
```

Note that **mutating state in an arrow function with an implicit return breaks this rule and causes an error!** This is because statements and function calls may return a value, and Immer sees both the attempted mutation and _and_ the new returned value and doesn't know which to use as the result. Some potential solutions are using the `void` keyword to skip having a return value, or using curly braces to give the arrow function a body and no return value:

```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    // ❌ ERROR: mutates state, but also returns new array size!
    brokenReducer: (state, action) => state.push(action.payload),
    // ✅ SAFE: the `void` keyword prevents a return value
    fixedReducer1: (state, action) => void state.push(action.payload),
    // ✅ SAFE: curly braces make this a function body and no return
    fixedReducer2: (state, action) => {
      state.push(action.payload)
    },
  },
})
```

While writing nested immutable update logic is hard, there are times when it _is_ simpler to do an object spread operation to update multiple fields at once, vs assigning individual fields:

```js
function objectCaseReducer1(state, action) {
  const { a, b, c, d } = action.payload
  return {
    ...state,
    a,
    b,
    c,
    d,
  }
}

function objectCaseReducer2(state, action) {
  const { a, b, c, d } = action.payload
  // This works, but we keep having to repeat `state.x =`
  state.a = a
  state.b = b
  state.c = c
  state.d = d
}
```

As an alternative, you can use `Object.assign` to mutate multiple fields at once, since `Object.assign` always mutates the first object that it's given:

```js
function objectCaseReducer3(state, action) {
  const { a, b, c, d } = action.payload
  Object.assign(state, { a, b, c, d })
}
```

### Resetting and Replacing State

Sometimes you may want to replace the entire existing `state`, either because you've loaded some new data, or you want to reset the state back to its initial value.

:::warning

**A common mistake is to try assigning `state = someValue` directly. This will not work!** This only points the local `state` variable to a different reference. That is neither mutating the existing `state` object/array in memory, nor returning an entirely new value, so Immer does not make any actual changes.

:::

Instead, to replace the existing state, you should return the new value directly:

```js
const initialState = []
const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    brokenTodosLoadedReducer(state, action) {
      // ❌ ERROR: does not actually mutate or return anything new!
      state = action.payload
    },
    fixedTodosLoadedReducer(state, action) {
      // ✅ CORRECT: returns a new value to replace the old one
      return action.payload
    },
    correctResetTodosReducer(state, action) {
      // ✅ CORRECT: returns a new value to replace the old one
      return initialState
    },
  },
})
```

### Debugging and Inspecting Drafted State

It's common to want to log in-progress state from a reducer to see what it looks like as it's being updated, like `console.log(state)`. Unfortunately, browsers display logged Proxy instances in a format that is hard to read or understand:

![Logged proxy draft](/img/usage/immer-reducers/logged-proxy.png)

To work around this, [Immer includes a `current` function that extracts a copy of the wrapped data](https://immerjs.github.io/immer/current), and RTK re-exports `current`. You can use this in your reducers if you need to log or inspect the work-in-progress state:

```js
import { current } from '@reduxjs/toolkit'

const todosSlice = createSlice({
  name: 'todos',
  initialState: todosAdapter.getInitialState(),
  reducers: {
    todoToggled(state, action) {
      // ❌ ERROR: logs the Proxy-wrapped data
      console.log(state)
      // ✅ CORRECT: logs a plain JS copy of the current data
      console.log(current(state))
    },
  },
})
```

The correct output would look like this instead:

![Logged current value](/img/usage/immer-reducers/logged-current-state.png)

Immer also provides [`original` and `isDraft` functions](https://immerjs.github.io/immer/original), which retrieves the original data without any updates applied and check to see if a given value is a Proxy-wrapped draft. As of RTK 1.5.1, both of those are re-exported from RTK as well.

### Updating Nested Data

Immer greatly simplifies updating nested data. Nested objects and arrays are also wrapped in Proxies and drafted, and it's safe to pull out a nested value into its own variable and then mutate it.

However, this still only applies to objects and arrays. If we pull out a primitive value into its own variable and try to update it, Immer has nothing to wrap and cannot track any updates:

```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    brokenTodoToggled(state, action) {
      const todo = state.find((todo) => todo.id === action.payload)
      if (todo) {
        // ❌ ERROR: Immer can't track updates to a primitive value!
        let { completed } = todo
        completed = !completed
      }
    },
    fixedTodoToggled(state, action) {
      const todo = state.find((todo) => todo.id === action.payload)
      if (todo) {
        // ✅ CORRECT: This object is still wrapped in a Proxy, so we can "mutate" it
        todo.completed = !todo.completed
      }
    },
  },
})
```

There _is_ a gotcha here. [Immer will not wrap objects that are newly inserted into the state](https://immerjs.github.io/immer/pitfalls#data-not-originating-from-the-state-will-never-be-drafted). Most of the time this shouldn't matter, but there may be occasions when you want to insert a value and then make further updates to it.

Related to this, RTK's [`createEntityAdapter` update functions](../api/createEntityAdapter.mdx#crud-functions) can either be used as standalone reducers, or "mutating" update functions. These functions determine whether to "mutate" or return a new value by checking to see if the state they're given is wrapped in a draft or not. If you are calling these functions yourself inside of a case reducer, be sure you know whether you're passing them a draft value or a plain value.

Finally, it's worth noting that **Immer does not automatically create nested objects or arrays for you - you have to create them yourself**. As an example, say we have a lookup table containing nested arrays, and we want to insert an item into one of those arrays. If we unconditionally try to insert without checking for the existence of that array, the logic will crash when the array doesn't exist. Instead, you'd need to ensure the array exists first:

```js
const itemsSlice = createSlice({
  name: 'items',
  initialState: { a: [], b: [] },
  reducers: {
    brokenNestedItemAdded(state, action) {
      const { id, item } = action.payload
      // ❌ ERROR: will crash if no array exists for `id`!
      state[id].push(item)
    },
    fixedNestedItemAdded(state, action) {
      const { id, item } = action.payload
      // ✅ CORRECT: ensures the nested array always exists first
      if (!state[id]) {
        state[id] = []
      }

      state[id].push(item)
    },
  },
})
```

### Linting State Mutations

Many ESLint configs include the https://eslint.org/docs/rules/no-param-reassign rule, which may also warn about mutations to nested fields. That can cause the rule to warn about mutations to `state` in Immer-powered reducers, which is not helpful.

To resolve this, you can tell the ESLint rule to ignore mutations to a parameter named `state`:

```js
{
  'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['state'] }]
}

```

## Why Immer is Built In

We've received a number of requests over time to make Immer an optional part of RTK's `createSlice` and `createReducer` APIs, rather than strictly required.

Our answer is always the same: **Immer _is required_ in RTK, and that is not going to change**.

It's worth going over the reasons why we consider Immer to be a critical part of RTK and why we will not make it optional.

### Benefits of Immer

Immer has two primary benefits. First, **Immer drastically simplifies immutable update logic**. [Proper immutable updates are extremely verbose](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns#updating-nested-objects). Those verbose operations are hard to read overall, and also obfuscate what the actual intent of the update statement is. Immer eliminates all the nested spreads and array slices. Not only is the code shorter and easier to read, it's much more clear what actual update is supposed to happen.

Second, [writing immutable updates correctly is _hard_](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns), and it is really easy to make mistakes (like forgetting to copy a level of nesting in a set of object spreads, copying a top-level array and not the item to be updated inside the array, or forgetting that `array.sort()` mutates the array). This is part of why [accidental mutations has always been the most common cause of Redux bugs](https://redux.js.org/faq/react-redux#why-isnt-my-component-re-rendering-or-my-mapstatetoprops-running). **Immer effectively _eliminates_ accidental mutations**. Not only are there no more spread operations that can be mis-written, but Immer freezes state automatically as well. This causes errors to be thrown if you do accidentally mutate, even outside of a reducer. **Eliminating the #1 cause of Redux bugs is a _huge_ improvement.**

Additionally, RTK Query uses Immer's patch capabilities to enable [optimistic updates and manual cache updates](../rtk-query/usage/manual-cache-updates.mdx) as well.

### Tradeoffs and Concerns

Like any tool, using Immer does have tradeoffs, and users have expressed a number of concerns about using it.

Immer does add to the overall app bundle size. It's about 8K min, 3.3K min+gz (ref: [Immer docs: Installation](https://immerjs.github.io/immer/installation), [Bundle.js.org analysis](https://bundle.js.org/?q=immer&treeshake=[{default+as+produce+}])). However, that library bundle size starts to pay for itself by shrinking the amount of reducer logic in your app. Additionally, the benefits of more readable code and eliminating mutation bugs are worth the size.

Immer also adds a bit of overhead in runtime performance. However, [per the Immer "Performance" docs page, the overhead is not meaningful in practice](https://immerjs.github.io/immer/performance/). Additionally, [reducers are almost never a perf bottleneck in a Redux app anyway](https://github.com/reduxjs/redux-toolkit/issues/242#issuecomment-583296008). Instead, the cost of updating the UI is much more important.

So, while using Immer isn't "free", the bundle and perf costs are small enough to be worth it.

The most realistic pain point with using Immer is that browser debuggers show Proxies in a confusing way, which makes it hard to inspect state variables while debugging. This is certainly an annoyance. However, this doesn't actually affect runtime behavior, and we've [documented the use of `current` to create a viewable plain JS version of the data](#debugging-and-inspecting-drafted-state) above in this page. (Given the increasingly wide use of Proxies as part of libraries like Mobx and Vue 3, this is also not unique to Immer.)

Another issue is education and understanding. Redux has always required immutability in reducers, and so seeing "mutating" code can be confusing. It's certainly possible that new Redux users might see those "mutations" in example code, assume that it's normal for Redux usage, and later try to do the same thing outside of `createSlice`. This would indeed cause real mutations and bugs, because it's outside of Immer's ability to wrap the updates.

We've addressed this by [repeatedly emphasizing the important of immutability throughout our docs](https://redux.js.org/tutorials/essentials/part-1-overview-concepts#immutability), including multiple highlighted sections emphasizing that [the "mutations" only work right thanks to Immer's "magic" inside](https://redux.js.org/tutorials/essentials/part-2-app-structure#reducers-and-immutable-updates) and adding this specific docs page you're reading now.

### Architecture and Intent

There's two more reasons why Immer is not optional.

One is RTK's architecture. `createSlice` and `createReducer` are implemented by directly importing Immer. There's no easy way to create a version of either of them that would have a hypothetical `immer: false` option. You can't do optional imports, and we need Immer available immediately and synchronously during the initial load of the app.

Additionally, RTK currently calls [Immer's `enableES5` plugin](https://immerjs.github.io/immer/installation#pick-your-immer-version) immediately on import, in order to ensure that Immer works correctly in environments without ES6 Proxy support (such as IE11 and older React Native versions). This is necessary because Immer split out the ES5 behavior into a plugin around version 6.0, but dropping the ES5 support would have been a major breaking change for RTK and broken our users. Because RTK itself calls `enableES5` from the entry point, Immer is _always_ pulled in.

And finally: **Immer is built into RTK by default because we believe it is the best choice for our users!** We _want_ our users to be using Immer, and consider it to be a critical non-negotiable component of RTK. The great benefits like simpler reducer code and preventing accidental mutations far outweigh the relatively small concerns.

## Further Information

See [the Immer documentation](https://immerjs.github.io/immer/) for more details on Immer's APIs, edge cases, and behavior.

For historical discussion on why Immer is required, see these issues:

- [RTK #5: Why Immer inside a starter kit?](https://github.com/reduxjs/redux-toolkit/issues/5)
- [RTK #183: Consider adding an option to remove Immer](https://github.com/reduxjs/redux-toolkit/issues/183)
- [RTK #242: make `immer` optional for `createReducer`](https://github.com/reduxjs/redux-toolkit/issues/242)
