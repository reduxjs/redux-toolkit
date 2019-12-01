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

Using [configureStore](../api/configureStore.ms) should not need any additional typings. You might, however, want to extract the `RootState` type and the `Dispatch` type.

### Getting the `State` type

The easiest way of getting the `State` type is to define the root reducer in advance and extract its `ReturnType`.  
It is recommend to give the type a different name like `RootState` to prevent confusion, as the type name `State` is usually overused.

```typescript
import { combineReducers } from '@reduxjs/toolkit'
const rootReducer = combineReducers({})
export type RootState = ReturnType<typeof rootReducer>
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

### Extending the `Dispatch` type

By default, this `AppDispatch` type will account only for the already included `redux-thunk` middleware. If you're adding additional middlewares that provide different return types for some actions, you can overload that `AppDispatch` type. While you can just extend the `AppDispatch` type, it's recommended to do so by adding additional type overloads for `dispatch` on the store, to keep everything more consistent:

```typescript
const _store = configureStore({
  /* ... */
})

type EnhancedStoreType = {
  dispatch(action: MyCustomActionType): MyCustomReturnType
  dispatch(action: MyCustomActionType2): MyCustomReturnType2
} & typeof _store

export const store: EnhancedStoreType = _store
export type AppDispatch = typeof store.dispatch
```

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

Like in `createReducer`, the `extraReducers` map object is not easy to fully type. So, like with `createReducer`, you may also use the "builder callback" approach for defining the reducer object argument. See [the `createReducer` section above](#createReducer) for an example.
