---
id: usage-with-typescript
title: Usage With TypeScript
sidebar_label: Usage With TypeScript
hide_title: true
---

# Usage With TypeScript

Redux Toolkit is written in TypeScript, and its API is designed to enable great integration with TypeScript applications.

This page is intended to give an overview of all common usecases and the most probable pitfalls you might encounter when using RTK with TypeScript.

**If you encounter any problems with the types that are not described on this page, please open an issue for discussion.**

## Using `configureStore` with TypeScript

Using [configureStore](../api/configureStore.md) should not need any additional typings. You might, however, want to extract the `RootState` type and the `Dispatch` type.

### Getting the `State` type

The easiest way of getting the `State` type is to define the root reducer in advance and extract its `ReturnType`.  
It is recommend to give the type a different name like `RootState` to prevent confusion, as the type name `State` is usually overused.

```typescript
import { combineReducers } from '@reduxjs/toolkit'
const rootReducer = combineReducers({})
export type RootState = ReturnType<typeof rootReducer>
```

If you pass the reducers directly to `configureStore()` you can get the `State` type from the store instead.

```typescript
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
const store = configureStore({
  reducer: rootReducer
})
export type RootState = ReturnType<typeof store.getState>
```

### Getting the `Dispatch` type

If you want to get the `Dispatch` type from your store, you can extract it after creating the store.  
It is recommend to give the type a different name like `AppDispatch` to prevent confusion, as the type name `Dispatch` is usually overused.

```typescript
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
const store = configureStore({
  reducer: rootReducer
})
export type AppDispatch = typeof store.dispatch
```

### Correct typings for the `Dispatch` type

The type of the `dispatch` function type will be directly inferred from the `middleware` option. So if you add _correctly typed_ middlewares, `dispatch` should already be correctly typed.

There might however be cases, where TypeScript decides to simplify your provided middleware array down to just `Array<Middleware>`. In that case, you have to either specify the array type manually as a tuple, or in TS versions >= 3.4, just add `as const` to your definition.

Please note that when calling `getDefaultMiddleware` in TypeScript, you have to provide the state type as a generic argument.

```ts
import { configureStore } from '@reduxjs/toolkit'
import additionalMiddleware from 'additional-middleware'
// @ts-ignore
import untypedMiddleware from 'untyped-middleware'
import rootReducer from './rootReducer'

type RootState = ReturnType<typeof rootReducer>
const store = configureStore({
  reducer: rootReducer,
  middleware: [
    // getDefaultMiddleware needs to be called with the state type
    ...getDefaultMiddleware<RootState>(),
    // correctly typed middlewares can just be used
    additionalMiddleware,
    // you can also manually type middlewares manually
    untypedMiddleware as Middleware<
      (action: Action<'specialAction'>) => number,
      RootState
    >
  ] as const // prevent this from becoming just `Array<Middleware>`
})

type AppDispatch = typeof store.dispatch
```

If you need any additional reference or examples, [the type tests for `configureStore`](https://github.com/reduxjs/redux-toolkit/blob/master/type-tests/files/configureStore.typetest.ts) contain many different scenarios on how to type this.

### Using the extracted `Dispatch` type with React-Redux

By default, the React-Redux `useDispatch` hook does not contain any types that take middlewares into account. If you need a more specific type for the `dispatch` function when dispatching, you may specify the type of the returned `dispatch` function, or create a custom-typed version of `useSelector`. See [the React-Redux documentation](https://react-redux.js.org/using-react-redux/static-typing#typing-the-usedispatch-hook) for details.

## `createAction`

For most use cases, there is no need to have a literal definition of `action.type`, so the following can be used:

```typescript
createAction<number>('test')
```

This will result in the created action being of type `PayloadActionCreator<number, string>`.

In some setups, you will need a literal type for `action.type`, though.
Unfortunately, TypeScript type definitions do not allow for a mix of manually-defined and inferred type parameters, so you'll have to specify the `type` both in the Generic definition as well as in the actual JavaScript code:

```typescript
createAction<number, 'test'>('test')
```

If you are looking for an alternate way of writing this without the duplication, you can use a prepare callback so that both type parameters can be inferred from arguments, removing the need to specify the action type.

```typescript
function withPayloadType<T>() {
  return (t: T) => ({ payload: t })
}
createAction('test', withPayloadType<string>())
```

### Alternative to using a literally-typed `action.type`

If you are using `action.type` as discriminator on a discriminated union, for example to correctly type your payload in `case` statements, you might be interested in this alternative:

Created action creators have a `match` method that acts as a [type predicate](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates):

```typescript
const increment = createAction<number>('increment')
function test(action: Action) {
  if (increment.match(action)) {
    // action.payload inferred correctly here
    action.payload
  }
}
```

This `match` method is also very useful in combination with `redux-observable` and RxJS's `filter` method.

## `createReducer`

The default way of calling `createReducer` would be with a map object, like this:

```typescript
createReducer(0, {
  increment: (state, action: PayloadAction<number>) => state + action.payload
})
```

Unfortunately, as the keys are only strings, using that API TypeScript can neither infer nor validate the action types for you:

```typescript
{
  const increment = createAction<number, 'increment'>('increment')
  const decrement = createAction<number, 'decrement'>('decrement')
  createReducer(0, {
    [increment.type]: (state, action) => {
      // action is any here
    },
    [decrement.type]: (state, action: PayloadAction<string>) => {
      // even though action should actually be PayloadAction<number>, TypeScript can't detect that and won't give a warning here.
    }
  })
}
```

As an alternative, RTK includes a type-safe reducer builder API.

### Building Type-Safe Reducer Argument Objects

Instead of using a simple object as an argument to `createReducer`, you can also use a callback that receives a `ActionReducerMapBuilder` instance:

```typescript
const increment = createAction<number, 'increment'>('increment')
const decrement = createAction<number, 'decrement'>('decrement')
createReducer(0, builder =>
  builder
    .addCase(increment, (state, action) => {
      // action is inferred correctly here
    })
    .addCase(decrement, (state, action: PayloadAction<string>) => {
      // this would error out
    })
)
```

We recommend using this API if stricter type safety is necessary when defining reducer argument objects.

## `createSlice`

As `createSlice` creates your actions as well as your reducer for you, you don't have to worry about type safety here.
Action types can just be provided inline:

```typescript
{
  const slice = createSlice({
    name: 'test',
    initialState: 0,
    reducers: {
      increment: (state, action: PayloadAction<number>) =>
        state + action.payload
    }
  })
  // now available:
  slice.actions.increment(2)
  // also available:
  slice.caseReducers.increment(0, { type: 'increment', payload: 5 })
}
```

If you have too many reducers and defining them inline would be messy, you can also define them outside the `createSlice` call and type them as `CaseReducer`:

```typescript
type State = number
const increment: CaseReducer<State, PayloadAction<number>> = (state, action) =>
  state + action.payload

createSlice({
  name: 'test',
  initialState: 0,
  reducers: {
    increment
  }
})
```

### Defining the type of your `initialState`

You might have noticed that it is not a good idea to pass your `SliceState` type as a generic to `createSlice`. This is due to the fact that in almost all cases, follow-up generic parameters to `createSlice` need to be inferred, and TypeScript cannot mix explicit declaration and inference of generic types within the same "generic block".

Instead, you can use the construct `initialState: myInitialState as SliceState`.

```ts
type SliceState = { state: 'loading' } | { state: 'finished'; data: string }

createSlice({
  name: 'test',
  initialState: { state: 'loading' } as SliceState,
  reducers: {
    // ...
  }
})
```

which will result in a `Slice<SliceState, ...>`.

### On the "type" property of slice action Reducers

As TS cannot combine two string literals (`slice.name` and the key of `actionMap`) into a new literal, all actionCreators created by createSlice are of type 'string'. This is usually not a problem, as these types are only rarely used as literals.

In most cases that type would be required as a literal, the `slice.action.myAction.match` [type predicate](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates) should prove as a viable alternative:

```typescript
const slice = createSlice({
  name: 'test',
  initialState: 0,
  reducers: {
    increment: (state, action: PayloadAction<number>) => state + action.payload
  }
})

function myCustomMiddleware(action: Action) {
  if (slice.actions.increment.match(action)) {
    // `action` is narrowed down to the type `PayloadAction<number>` here.
  }
}
```

If you actually _need_ that type, unfortunately there is no other way than manual casting.

### Type safety with `extraReducers`

Like in `createReducer`, the `extraReducers` map object is not easy to fully type. So, like with `createReducer`, you may also use the "builder callback" approach for defining the reducer object argument. See [the `createReducer` section above](#createreducer) for an example.

### Wrapping `createSlice`

If you need to reuse reducer logic, it is common to write ["higher-order reducers"](https://redux.js.org/recipes/structuring-reducers/reusing-reducer-logic#customizing-behavior-with-higher-order-reducers) that wrap a reducer function with additional common behavior. This can be done with `createSlice` as well, but due to the complexity of the types for `createSlice`, you have to use the `SliceCaseReducers` and `ValidateSliceCaseReducers` types in a very specific way.

Here is an example of such a "generic" wrapped `createSlice` call:

```ts
interface GenericState<T> {
  data?: T
  status: 'loading' | 'finished' | 'error'
}

const createGenericSlice = <
  T,
  Reducers extends SliceCaseReducers<GenericState<T>>
>({
  name = '',
  initialState,
  reducers
}: {
  name: string
  initialState: GenericState<T>
  reducers: ValidateSliceCaseReducers<GenericState<T>, Reducers>
}) => {
  return createSlice({
    name,
    initialState,
    reducers: {
      start(state) {
        state.status = 'loading'
      },
      /**
       * If you want to write to values of the state that depend on the generic
       * (in this case: `state.data`, which is T), you might need to specify the
       * State type manually here, as it defaults to `Draft<GenericState<T>>`,
       * which can sometimes be problematic with yet-unresolved generics.
       * This is a general problem when working with immer's Draft type and generics.
       */
      success(state: GenericState<T>, action: PayloadAction<T>) {
        state.data = action.payload
        state.status = 'finished'
      },
      ...reducers
    }
  })
}

const wrappedSlice = createGenericSlice({
  name: 'test',
  initialState: { status: 'loading' } as GenericState<string>,
  reducers: {
    magic(state) {
      state.status = 'finished'
      state.data = 'hocus pocus'
    }
  }
})
```
