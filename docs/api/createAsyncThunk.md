---
id: createAsyncThunk
title: createAsyncThunk
sidebar_label: createAsyncThunk
hide_title: true
---

# `createAsyncThunk`

## Overview

A function that accepts a Redux action type string and a callback function that should return a promise. It generates promise lifecycle action types based on the provided action type, and returns a thunk action creator that will run the promise callback and dispatch the lifecycle actions based on the returned promise.

This abstracts the standard recommended approach for handling async request lifecycles.

Sample usage:

```js {5-11,22-25,30}
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'

// First, create the thunk
const fetchUserById = createAsyncThunk(
  'users/fetchByIdStatus',
  async (userId, thunkAPI) => {
    const response = await userAPI.fetchById(userId)
    return response.data
  }
)

// Then, handle actions in your reducers:
const usersSlice = createSlice({
  name: 'users',
  initialState: { entities: [], loading: 'idle' },
  reducers: {
    // standard reducer logic, with auto-generated action types per reducer
  },
  extraReducers: {
    // Add reducers for additional action types here, and handle loading state as needed
    [fetchUserById.fulfilled]: (state, action) => {
      // Add user to the state array
      state.entities.push(action.payload)
    }
  }
})

// Later, dispatch the thunk as needed in the app
dispatch(fetchUserById(123))
```

## Parameters

### `type`

A string that will be used to generate additional Redux action type constants, representing the lifecycle of an async request:

For example, a `type` argument of `'users/requestStatus'` will generate these action types:

- `pending`: `'users/requestStatus/pending'`
- `fulfilled`: `'users/requestStatus/fulfilled'`
- `rejected`: `'users/requestStatus/rejected'`

### `payloadCreator`

A callback function that should return a promise containing the result of some asynchronous logic. It may also return a value synchronously. If there is an error, it should return a rejected promise containing either an `Error` instance or a plain value such as a descriptive error message.

The `payloadCreator` function can contain whatever logic you need to calculate an appropriate result. This could include a standard AJAX data fetch request, multiple AJAX calls with the results combined into a final value, interactions with React Native `AsyncStorage`, and so on.

The `payloadCreator` function will be called with two arguments:

- `thunkArg`: a single value, containing the first parameter that was passed to the thunk action creator when it was dispatched. This is useful for passing in values like item IDs that may be needed as part of the request. If you need to pass in multiple values, pass them together in an object when you dispatch the thunk, like `dispatch(fetchUsers({status: 'active', sortBy: 'name'}))`.
- `thunkAPI`: an object containing all of the parameters that are normally passed to a Redux thunk function, as well as additional options:
  - `dispatch`: the Redux store `dispatch` method
  - `getState`: the Redux store `getState` method
  - `extra`: the "extra argument" given to the thunk middleware on setup, if available
  - `requestId`: a unique string ID value that was automatically generated to identify this request sequence
  - `signal`: an [`AbortController.signal` object](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal) that may be used to see if another part of the app logic has marked this request as needing cancelation.

The logic in the `payloadCreator` function may use any of these values as needed to calculate the result.

## Return Value

`createAsyncThunk` returns a standard Redux thunk action creator. The thunk action creator function will have plain action creators for the `pending`, `fulfilled`, and `rejected` cases attached as nested fields.

When dispatched, the thunk will:

- dispatch the `pending` action
- call the `payloadCreator` callback and wait for the returned promise to settle
- when the promise settles:
  - if the promise resolved successfully, dispatch the `fulfilled` action with the promise value as `action.payload`
  - if the promise failed, dispatch the `rejected` action with a serialized version of the error value as `action.error`
- Return a fulfilled promise containing the final dispatched action (either the `fulfilled` or `rejected` action object)

## Promise Lifecycle Actions

`createAsyncThunk` will generate three Redux action creators using [`createAction`](./createAction.md): `pending`, `fulfilled`, and `rejected`. Each lifecycle action creator will be attached to the returned thunk action creator so that your reducer logic can reference the action types and respond to the actions when dispatched. Each action object will contain the current unique `requestId` and `args` values under `action.meta`.

The action creators will have these signatures:

```ts
interface SerializedError {
  name?: string
  message?: string
  code?: string
  stack?: string
}

interface PendingAction<ThunkArg> {
  type: string
  payload: undefined
  meta: {
    requestId: string
    thunkArg: ThunkArg
  }
}

interface FulfilledAction<ThunkArg, PromiseResult> {
  type: string
  payload: PromiseResult
  meta: {
    requestId: string
    thunkArg: ThunkArg
  }
}

interface RejectedAction<ThunkArg> {
  type: string
  payload: undefined
  error: SerializedError | any
  meta: {
    requestId: string
    thunkArg: ThunkArg
    aborted: boolean
    abortReason?: string
  }
}

type Pending = <ThunkArg>(
  requestId: string,
  thunkArg: ThunkArg
) => PendingAction<ThunkArg>

type Fulfilled = <ThunkArg, PromiseResult>(
  payload: PromiseResult,
  requestId: string,
  thunkArg: ThunkArg
) => FulfilledAction<ThunkArg, PromiseResult>

type Rejected = <ThunkArg>(
  requestId: string,
  thunkArg: ThunkArg
) => RejectedAction<ThunkArg>
```

To handle these actions in your reducers, reference the action creators in `createReducer` or `createSlice` using either the object key notation or the "builder callback" notation:

```js {2,6,14,23}
const reducer1 = createReducer(initialState, {
  [fetchUserById.fulfilled]: (state, action) => {}
})

const reducer2 = createReducer(initialState, build => {
  builder.addCase(fetchUserById.fulfilled, (state, action) => {})
})

const reducer3 = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: {
    [fetchUserById.fulfilled]: (state, action) => {}
  }
})

const reducer4 = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchUserById.fulfilled, (state, action) => {})
  }
})
```

## Handling Thunk Results

Thunks may return a value when dispatched. A common use case is to return a promise from the thunk, dispatch the thunk from a component, and then wait for the promise to resolve before doing additional work:

```js
const onClick = () => {
  dispatch(fetchUserById(userId)).then(() => {
    // do additional work
  })
}
```

The thunks generated by `createAsyncThunk` will always return a resolved promise with either the `fulfilled` action object or `rejected` action object inside, as appropriate.

The calling logic may wish to treat these actions as if they were the original promise contents. Redux Toolkit exports an `unwrapResult` function that can be used to extract the `payload` or `error` from the action and return or throw the result:

```js
import { unwrapResult } from '@reduxjs/toolkit'

// in the component
const onClick = () => {
  dispatch(fetchUserById(userId))
    .then(unwrapResult)
    .then(originalPromiseResult => {})
    .catch(serializedError => {})
}
```

## Examples

Requesting a user by ID, with loading state, and only one request at a time:

```js
import { createAsyncThunk, createSlice, unwrapResult } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'

const fetchUserById = createAsyncThunk(
  'users/fetchByIdStatus',
  async (userId, { getState }) => {
    const { loading } = getState().users
    if (loading !== 'idle') {
      return
    }
    const response = await userAPI.fetchById(userId)
    return response.data
  }
)

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: [],
    loading: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: {
    [fetchUserById.pending]: (state, action) => {
      if (state.loading === 'idle') {
        state.loading = 'pending'
      }
    },
    [fetchUserById.fulfilled]: (state, action) => {
      if (state.loading === 'pending') {
        state.loading = 'idle'
        state.push(action.payload)
      }
    },
    [fetchUserById.rejected]: (state, action) => {
      if (state.loading === 'pending') {
        state.loading = 'idle'
        state.error = action.error
      }
    }
  }
})

const UsersComponent = () => {
  const { users, loading, error } = useSelector(state => state.users)
  const dispatch = useDispatch()

  const fetchOneUser = async userId => {
    try {
      const resultAction = dispatch(fetchUserById(userId))
      const user = unwrapResult(resultAction)
      showToast('success', `Fetched ${user.name}`)
    } catch (err) {
      showToast('error', `Fetch failed: ${err.message}`)
    }
  }

  // render UI here
}
```
