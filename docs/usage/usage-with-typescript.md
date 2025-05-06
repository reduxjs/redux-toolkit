---
id: usage-with-typescript
title: Usage With TypeScript
sidebar_label: Usage With TypeScript
hide_title: true
---

&nbsp;

# Usage With TypeScript

:::tip What You'll Learn

- Details on how to use each Redux Toolkit API with TypeScript

:::

## Introduction

Redux Toolkit is written in TypeScript, and its API is designed to enable great integration with TypeScript applications.

This page provides specific details for each of the different APIs included in Redux Toolkit and how to type them correctly with TypeScript.

**See the [TypeScript Quick Start tutorial page](../tutorials/typescript.md) for a brief overview of how to set up and use Redux Toolkit and React Redux to work with TypeScript**.

:::info

If you encounter any problems with the types that are not described on this page, please [open an issue](https://github.com/reduxjs/redux-toolkit/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) for discussion.

:::

## `configureStore`

The basics of using `configureStore` are shown in [TypeScript Quick Start tutorial page](../tutorials/typescript.md). Here are some additional details that you might find useful.

### Getting the `State` type

The easiest way of getting the `State` type is to define the root reducer in advance and extract its `ReturnType`.
It is recommended to give the type a different name like `RootState` to prevent confusion, as the type name `State` is usually overused.

```typescript
import { combineReducers } from '@reduxjs/toolkit'
const rootReducer = combineReducers({})
// highlight-start
export type RootState = ReturnType<typeof rootReducer>
// highlight-end
```

Alternatively, if you choose to not create a `rootReducer` yourself and instead pass the slice reducers directly to `configureStore()`, you need to slightly modify the typing to correctly infer the root reducer:

```ts
import { configureStore } from '@reduxjs/toolkit'
// ...
const store = configureStore({
  reducer: {
    one: oneSlice.reducer,
    two: twoSlice.reducer,
  },
})
export type RootState = ReturnType<typeof store.getState>

export default store
```

If you pass the reducers directly to `configureStore()` and do not define the root reducer explicitly, there is no reference to `rootReducer`.
Instead, you can refer to `store.getState`, in order to get the `State` type.

```typescript
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
const store = configureStore({
  reducer: rootReducer,
})
export type RootState = ReturnType<typeof store.getState>
```

### Getting the `Dispatch` type

If you want to get the `Dispatch` type from your store, you can extract it after creating the store. It is recommended to give the type a different name like `AppDispatch` to prevent confusion, as the type name `Dispatch` is usually overused. You may also find it to be more convenient to export a hook like `useAppDispatch` shown below, then using it wherever you'd call `useDispatch`.

```typescript
import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import rootReducer from './rootReducer'

const store = configureStore({
  reducer: rootReducer,
})

// highlight-start
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>() // Export a hook that can be reused to resolve types
// highlight-end

export default store
```

### Correct typings for the `Dispatch` type

The type of the `dispatch` function type will be directly inferred from the `middleware` option. So if you add _correctly typed_ middlewares, `dispatch` should already be correctly typed.

As TypeScript often widens array types when combining arrays using the spread operator, we suggest using the `.concat(...)` and `.prepend(...)` methods of the `Tuple` returned by `getDefaultMiddleware()`.

```ts
import { configureStore } from '@reduxjs/toolkit'
import additionalMiddleware from 'additional-middleware'
import logger from 'redux-logger'
// @ts-ignore
import untypedMiddleware from 'untyped-middleware'
import rootReducer from './rootReducer'

export type RootState = ReturnType<typeof rootReducer>
const store = configureStore({
  reducer: rootReducer,
  // highlight-start
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(
        // correctly typed middlewares can just be used
        additionalMiddleware,
        // you can also type middlewares manually
        untypedMiddleware as Middleware<
          (action: Action<'specialAction'>) => number,
          RootState
        >,
      )
      // prepend and concat calls can be chained
      .concat(logger),
  // highlight-end
})

export type AppDispatch = typeof store.dispatch

export default store
```

#### Using `Tuple` without `getDefaultMiddleware`

If you want to skip the usage of `getDefaultMiddleware` altogether, you are required to use `Tuple` for type-safe creation of your `middleware` array. This class extends the default JavaScript `Array` type, only with modified typings for `.concat(...)` and the additional `.prepend(...)` method.

For example:

```ts
import { configureStore, Tuple } from '@reduxjs/toolkit'

configureStore({
  reducer: rootReducer,
  middleware: () => new Tuple(additionalMiddleware, logger),
})
```

### Using the extracted `Dispatch` type with React Redux

By default, the React Redux `useDispatch` hook does not contain any types that take middlewares into account. If you need a more specific type for the `dispatch` function when dispatching, you may specify the type of the returned `dispatch` function, or create a custom-typed version of `useSelector`. See [the React Redux documentation](https://react-redux.js.org/using-react-redux/static-typing#typing-the-usedispatch-hook) for details.

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

If you are using `action.type` as a discriminator on a discriminated union, for example to correctly type your payload in `case` statements, you might be interested in this alternative:

Created action creators have a `match` method that acts as a [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates):

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

### Building Type-Safe Reducer Argument Objects

The second parameter for `createReducer` is a callback that receives a `ActionReducerMapBuilder` instance:

```typescript {3-10}
const increment = createAction<number, 'increment'>('increment')
const decrement = createAction<number, 'decrement'>('decrement')
createReducer(0, (builder) =>
  builder
    .addCase(increment, (state, action) => {
      // action is inferred correctly here
    })
    .addCase(decrement, (state, action: PayloadAction<string>) => {
      // this would error out
    }),
)
```

#### Typing `builder.addMatcher`

As the first `matcher` argument to `builder.addMatcher`, a [type predicate](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates) function should be used.
As a result, the `action` argument for the second `reducer` argument can be inferred by TypeScript:

```ts
function isNumberValueAction(action: UnknownAction): action is PayloadAction<{ value: number }> {
  return typeof action.payload.value === 'number'
}

createReducer({ value: 0 }, builder =>
   builder.addMatcher(isNumberValueAction, (state, action) => {
      state.value += action.payload.value
   })
})
```

## `createSlice`

As `createSlice` creates your actions as well as your reducer for you, you don't have to worry about type safety here.
Action types can just be provided inline:

```typescript
const slice = createSlice({
  name: 'test',
  initialState: 0,
  reducers: {
    increment: (state, action: PayloadAction<number>) => state + action.payload,
  },
})
// now available:
slice.actions.increment(2)
// also available:
slice.caseReducers.increment(0, { type: 'increment', payload: 5 })
```

If you have too many case reducers and defining them inline would be messy, or you want to reuse case reducers across slices, you can also define them outside the `createSlice` call and type them as `CaseReducer`:

```typescript
type State = number
const increment: CaseReducer<State, PayloadAction<number>> = (state, action) =>
  state + action.payload

createSlice({
  name: 'test',
  initialState: 0,
  reducers: {
    increment,
  },
})
```

### Defining the Initial State Type

You might have noticed that it is not a good idea to pass your `SliceState` type as a generic to `createSlice`. This is due to the fact that in almost all cases, follow-up generic parameters to `createSlice` need to be inferred, and TypeScript cannot mix explicit declaration and inference of generic types within the same "generic block".

The standard approach is to declare an interface or type for your state, create an initial state value that uses that type, and pass the initial state value to `createSlice`. You can also use the construct `initialState: myInitialState satisfies SliceState as SliceState`.

```ts {1,4,8,15}
type SliceState = { state: 'loading' } | { state: 'finished'; data: string }

// First approach: define the initial state using that type
const initialState: SliceState = { state: 'loading' }

createSlice({
  name: 'test1',
  initialState, // type SliceState is inferred for the state of the slice
  reducers: {},
})

// Or, cast the initial state as necessary
createSlice({
  name: 'test2',
  initialState: { state: 'loading' } satisfies SliceState as SliceState,
  reducers: {},
})
```

which will result in a `Slice<SliceState, ...>`.

### Defining Action Contents with `prepare` Callbacks

If you want to add a `meta` or `error` property to your action, or customize the `payload` of your action, you have to use the `prepare` notation.

Using this notation with TypeScript looks like this:

```ts {5-16}
const blogSlice = createSlice({
  name: 'blogData',
  initialState,
  reducers: {
    receivedAll: {
      reducer(
        state,
        action: PayloadAction<Page[], string, { currentPage: number }>,
      ) {
        state.all = action.payload
        state.meta = action.meta
      },
      prepare(payload: Page[], currentPage: number) {
        return { payload, meta: { currentPage } }
      },
    },
  },
})
```

### Generated Action Types for Slices

`createSlice` generates action type strings by combining the `name` field from the slice with the field name of the reducer function, like `'test/increment'`. This is strongly typed as the exact value, thanks to TS's string literal analysis.

You can also use the `slice.action.myAction.match` [type predicate](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates), which will narrow down an action object to the exact type:

```ts {10}
const slice = createSlice({
  name: 'test',
  initialState: 0,
  reducers: {
    increment: (state, action: PayloadAction<number>) => state + action.payload,
  },
})

type incrementType = typeof slice.actions.increment.type
// type incrementType = 'test/increment'

function myCustomMiddleware(action: Action) {
  if (slice.actions.increment.match(action)) {
    // `action` is narrowed down to the type `PayloadAction<number>` here.
  }
}
```

If you actually _need_ that type, unfortunately there is no other way than manual casting.

### Type safety with `extraReducers`

Reducer lookup tables that map an action `type` string to a reducer function are not easy to fully type correctly. This affects both `createReducer` and the `extraReducers` argument for `createSlice`. So, like with `createReducer`, [you should use the "builder callback" approach](#building-type-safe-reducer-argument-objects) for defining the reducer object argument.

This is particularly useful when a slice reducer needs to handle action types generated by other slices, or generated by specific calls to `createAction` (such as the actions generated by [`createAsyncThunk`](../api/createAsyncThunk.mdx)).

```ts {27-30}
const fetchUserById = createAsyncThunk(
  'users/fetchById',
  // if you type your function argument here
  async (userId: number) => {
    const response = await fetch(`https://reqres.in/api/users/${userId}`)
    return (await response.json()) as Returned
  },
)

interface UsersState {
  entities: User[]
  loading: 'idle' | 'pending' | 'succeeded' | 'failed'
}

const initialState = {
  entities: [],
  loading: 'idle',
} satisfies UsersState as UsersState

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // fill in primary logic here
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserById.pending, (state, action) => {
      // both `state` and `action` are now correctly typed
      // based on the slice state and the `pending` action creator
    })
  },
})
```

Like the `builder` in `createReducer`, this `builder` also accepts `addMatcher` (see [typing `builder.matcher`](#typing-builderaddmatcher)) and `addDefaultCase`.

### Payload with All Optional Fields

If you try to supply a payload type where all fields are optional, like `PayloadAction<Partial<User>>` or `PayloadAction<{value?: string}>`, TS may not be able to infer the action type correctly.

You can work around this by [using a custom `AtLeastOne` utility type](https://github.com/reduxjs/redux-toolkit/issues/1423#issuecomment-902680573) to help ensure that at least one of the fields must be passed in:

```ts no-transpile
type AtLeastOne<T extends Record<string, any>> = keyof T extends infer K
  ? K extends string
    ? Pick<T, K & keyof T> & Partial<T>
    : never
  : never

// Use this type instead of `Partial<MyPayloadType>`
type AtLeastOneUserField = AtLeastOne<User>
```

### Typing Async Thunks Inside `createSlice`

As of 2.0, `createSlice` allows [defining thunks inside of `reducers` using a callback syntax](../api/createSlice.mdx#the-reducers-creator-callback-notation).

Typing for the `create.asyncThunk` method works in the same way as [`createAsyncThunk`](#createasyncthunk), with one key difference.

A type for `state` and/or `dispatch` _cannot_ be provided as part of the `ThunkApiConfig`, as this would cause circular types.

Instead, it is necessary to assert the type when needed - `getState() as RootState`. You may also include an explicit return type for the payload function as well, in order to break the circular type inference cycle.

```ts no-transpile
create.asyncThunk<Todo, string, { rejectValue: { error: string } }>(
  // highlight-start
  // may need to include an explicit return type
  async (id: string, thunkApi): Promise<Todo> => {
    // Cast types for `getState` and `dispatch` manually
    const state = thunkApi.getState() as RootState
    const dispatch = thunkApi.dispatch as AppDispatch
    // highlight-end
    try {
      const todo = await fetchTodo()
      return todo
    } catch (e) {
      throw thunkApi.rejectWithValue({
        error: 'Oh no!',
      })
    }
  },
)
```

For common thunk API configuration options, a [`withTypes` helper](../usage/usage-with-typescript#defining-a-pre-typed-createasyncthunk) is provided:

```ts no-transpile
reducers: (create) => {
  const createAThunk = create.asyncThunk.withTypes<{
    rejectValue: { error: string }
  }>()

  return {
    fetchTodo: createAThunk<Todo, string>(async (id, thunkApi) => {
      throw thunkApi.rejectWithValue({
        error: 'Oh no!',
      })
    }),
    fetchTodos: createAThunk<Todo[], string>(async (id, thunkApi) => {
      throw thunkApi.rejectWithValue({
        error: 'Oh no, not again!',
      })
    }),
  }
}
```

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
  Reducers extends SliceCaseReducers<GenericState<T>>,
>({
  name = '',
  initialState,
  reducers,
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
      ...reducers,
    },
  })
}

const wrappedSlice = createGenericSlice({
  name: 'test',
  initialState: { status: 'loading' } as GenericState<string>,
  reducers: {
    magic(state) {
      state.status = 'finished'
      state.data = 'hocus pocus'
    },
  },
})
```

## `createAsyncThunk`

### Basic `createAsyncThunk` Types

In the most common use cases, you should not need to explicitly declare any types for the `createAsyncThunk` call itself.

Just provide a type for the first argument to the `payloadCreator` argument as you would for any function argument, and the resulting thunk will accept the same type as its input parameter.
The return type of the `payloadCreator` will also be reflected in all generated action types.

```ts
interface MyData {
  // ...
}

const fetchUserById = createAsyncThunk(
  'users/fetchById',
  // highlight-start
  // Declare the type your function argument here:
  async (userId: number) => {
    // highlight-end
    const response = await fetch(`https://reqres.in/api/users/${userId}`)
    // Inferred return type: Promise<MyData>
    // highlight-next-line
    return (await response.json()) as MyData
  },
)

// the parameter of `fetchUserById` is automatically inferred to `number` here
// and dispatching the resulting thunkAction will return a Promise of a correctly
// typed "fulfilled" or "rejected" action.
const lastReturnedAction = await store.dispatch(fetchUserById(3))
```

### Typing the `thunkApi` Object

The second argument to the `payloadCreator`, known as `thunkApi`, is an object containing references to the `dispatch`, `getState`, and `extra` arguments from the thunk middleware as well as a utility function called `rejectWithValue`. If you want to use these from within the `payloadCreator`, you will need to define some generic arguments, as the types for these arguments cannot be inferred. Also, as TS cannot mix explicit and inferred generic parameters, from this point on you'll have to define the `Returned` and `ThunkArg` generic parameter as well.

#### Manually Defining `thunkApi` Types

To define the types for these arguments, pass an object as the third generic argument, with type declarations for some or all of these fields:

```ts
type AsyncThunkConfig = {
  /** return type for `thunkApi.getState` */
  state?: unknown
  /** type for `thunkApi.dispatch` */
  dispatch?: Dispatch
  /** type of the `extra` argument for the thunk middleware, which will be passed in as `thunkApi.extra` */
  extra?: unknown
  /** type to be passed into `rejectWithValue`'s first argument that will end up on `rejectedAction.payload` */
  rejectValue?: unknown
  /** return type of the `serializeError` option callback */
  serializedErrorType?: unknown
  /** type to be returned from the `getPendingMeta` option callback & merged into `pendingAction.meta` */
  pendingMeta?: unknown
  /** type to be passed into the second argument of `fulfillWithValue` to finally be merged into `fulfilledAction.meta` */
  fulfilledMeta?: unknown
  /** type to be passed into the second argument of `rejectWithValue` to finally be merged into `rejectedAction.meta` */
  rejectedMeta?: unknown
}
```

```ts
const fetchUserById = createAsyncThunk<
  // highlight-start
  // Return type of the payload creator
  MyData,
  // First argument to the payload creator
  number,
  {
    // Optional fields for defining thunkApi field types
    dispatch: AppDispatch
    state: State
    extra: {
      jwt: string
    }
  }
  // highlight-end
>('users/fetchById', async (userId, thunkApi) => {
  const response = await fetch(`https://reqres.in/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${thunkApi.extra.jwt}`,
    },
  })
  return (await response.json()) as MyData
})
```

If you are performing a request that you know will typically either be a success or have an expected error format, you can pass in a type to `rejectValue` and `return rejectWithValue(knownPayload)` in the action creator. This allows you to reference the error payload in the reducer as well as in a component after dispatching the `createAsyncThunk` action.

```ts
interface MyKnownError {
  errorMessage: string
  // ...
}
interface UserAttributes {
  id: string
  first_name: string
  last_name: string
  email: string
}

const updateUser = createAsyncThunk<
  // Return type of the payload creator
  MyData,
  // First argument to the payload creator
  UserAttributes,
  // Types for ThunkAPI
  {
    extra: {
      jwt: string
    }
    rejectValue: MyKnownError
  }
>('users/update', async (user, thunkApi) => {
  const { id, ...userData } = user
  const response = await fetch(`https://reqres.in/api/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${thunkApi.extra.jwt}`,
    },
    body: JSON.stringify(userData),
  })
  if (response.status === 400) {
    // Return the known error for future handling
    return thunkApi.rejectWithValue((await response.json()) as MyKnownError)
  }
  return (await response.json()) as MyData
})
```

While this notation for `state`, `dispatch`, `extra` and `rejectValue` might seem uncommon at first, it allows you to provide only the types for these you actually need - so for example, if you are not accessing `getState` within your `payloadCreator`, there is no need to provide a type for `state`. The same can be said about `rejectValue` - if you don't need to access any potential error payload, you can ignore it.

In addition, you can leverage checks against `action.payload` and `match` as provided by `createAction` as a type-guard for when you want to access known properties on defined types. Example:

- In a reducer

```ts
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: {},
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(updateUser.fulfilled, (state, { payload }) => {
      state.entities[payload.id] = payload
    })
    builder.addCase(updateUser.rejected, (state, action) => {
      if (action.payload) {
        // Since we passed in `MyKnownError` to `rejectValue` in `updateUser`, the type information will be available here.
        state.error = action.payload.errorMessage
      } else {
        state.error = action.error
      }
    })
  },
})
```

- In a component

```ts
const handleUpdateUser = async (userData) => {
  const resultAction = await dispatch(updateUser(userData))
  if (updateUser.fulfilled.match(resultAction)) {
    const user = resultAction.payload
    showToast('success', `Updated ${user.name}`)
  } else {
    if (resultAction.payload) {
      // Since we passed in `MyKnownError` to `rejectValue` in `updateUser`, the type information will be available here.
      // Note: this would also be a good place to do any handling that relies on the `rejectedWithValue` payload, such as setting field errors
      showToast('error', `Update failed: ${resultAction.payload.errorMessage}`)
    } else {
      showToast('error', `Update failed: ${resultAction.error.message}`)
    }
  }
}
```

### Defining a Pre-Typed `createAsyncThunk`

As of RTK 1.9, you can define a "pre-typed" version of `createAsyncThunk` that can have the types for `state`, `dispatch`, and `extra` built in. This lets you set up those types once, so you don't have to repeat them each time you call `createAsyncThunk`.

To do this, call `createAsyncThunk.withTypes<>()`, and pass in an object containing the field names and types for any of the fields in the `AsyncThunkConfig` type listed above. This might look like:

```ts
const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState
  dispatch: AppDispatch
  rejectValue: string
  extra: { s: string; n: number }
}>()
```

Import and use that pre-typed `createAppAsyncThunk` instead of the original, and the types will be used automatically.

## `createEntityAdapter`

Usage of `createEntityAdapter` with Typescript varies based on whether your entities are normalized by an `id` property, or whether a custom `selectId` is needed.

If your entities are normalized by an `id` property, `createEntityAdapter` only requires you to specify the entity type as the single generic argument. For example:

```ts
interface Book {
  id: number
  title: string
}

// no selectId needed here, as the entity has an `id` property we can default to
// highlight-next-line
const booksAdapter = createEntityAdapter<Book>({
  sortComparer: (a, b) => a.title.localeCompare(b.title),
})

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(),
  reducers: {
    bookAdded: booksAdapter.addOne,
    booksReceived(state, action: PayloadAction<{ books: Book[] }>) {
      booksAdapter.setAll(state, action.payload.books)
    },
  },
})
```

On the other hand, if the entity needs to be normalized by a different property, we instead recommend passing a custom `selectId` function and annotating there. This allows proper inference of the ID's type, instead of having to provide it manually.

```ts
interface Book {
  bookId: number
  title: string
  // ...
}

const booksAdapter = createEntityAdapter({
  // highlight-next-line
  selectId: (book: Book) => book.bookId,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
})

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(),
  reducers: {
    bookAdded: booksAdapter.addOne,
    booksReceived(state, action: PayloadAction<{ books: Book[] }>) {
      booksAdapter.setAll(state, action.payload.books)
    },
  },
})
```

### Using `createEntityAdapter` with `normalizr`

When using a library like [`normalizr`](https://github.com/paularmstrong/normalizr/), your normalized data will resemble this shape:

```js
{
  result: 1,
  entities: {
    1: { id: 1, other: 'property' },
    2: { id: 2, other: 'property' }
  }
}
```

The methods `addMany`, `upsertMany`, and `setAll` all allow you to pass in the `entities` portion of this directly with no extra conversion steps. However, the `normalizr` TS typings currently do not correctly reflect that multiple data types may be included in the results, so you will need to specify that type structure yourself.

Here is an example of how that would look:

```ts
type Author = { id: number; name: string }
type Article = { id: number; title: string }
type Comment = { id: number; commenter: number }

export const fetchArticle = createAsyncThunk(
  'articles/fetchArticle',
  async (id: number) => {
    const data = await fakeAPI.articles.show(id)
    // Normalize the data so reducers can responded to a predictable payload.
    // Note: at the time of writing, normalizr does not automatically infer the result,
    // so we explicitly declare the shape of the returned normalized data as a generic arg.
    const normalized = normalize<
      any,
      {
        articles: { [key: string]: Article }
        users: { [key: string]: Author }
        comments: { [key: string]: Comment }
      }
    >(data, articleEntity)
    return normalized.entities
  },
)

export const slice = createSlice({
  name: 'articles',
  initialState: articlesAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchArticle.fulfilled, (state, action) => {
      // The type signature on action.payload matches what we passed into the generic for `normalize`, allowing us to access specific properties on `payload.articles` if desired
      articlesAdapter.upsertMany(state, action.payload.articles)
    })
  },
})
```
