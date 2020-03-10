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

`createAsyncThunk` accepts two parameters: a string action `type` value, and a `payloadCreator` callback.

### `type`

A string that will be used to generate additional Redux action type constants, representing the lifecycle of an async request:

For example, a `type` argument of `'users/requestStatus'` will generate these action types:

- `pending`: `'users/requestStatus/pending'`
- `fulfilled`: `'users/requestStatus/fulfilled'`
- `rejected`: `'users/requestStatus/rejected'`

### `payloadCreator`

A callback function that should return a promise containing the result of some asynchronous logic. It may also return a value synchronously. If there is an error, it should either return a rejected promise containing an `Error` instance or a plain value such as a descriptive error message or otherwise a resolved promise with a `RejectWithValue` argument as returned by the `thunkApi.rejectWithValue` function.

The `payloadCreator` function can contain whatever logic you need to calculate an appropriate result. This could include a standard AJAX data fetch request, multiple AJAX calls with the results combined into a final value, interactions with React Native `AsyncStorage`, and so on.

The `payloadCreator` function will be called with two arguments:

- `arg`: a single value, containing the first parameter that was passed to the thunk action creator when it was dispatched. This is useful for passing in values like item IDs that may be needed as part of the request. If you need to pass in multiple values, pass them together in an object when you dispatch the thunk, like `dispatch(fetchUsers({status: 'active', sortBy: 'name'}))`.
- `thunkAPI`: an object containing all of the parameters that are normally passed to a Redux thunk function, as well as additional options:
  - `dispatch`: the Redux store `dispatch` method
  - `getState`: the Redux store `getState` method
  - `extra`: the "extra argument" given to the thunk middleware on setup, if available
  - `requestId`: a unique string ID value that was automatically generated to identify this request sequence
  - `signal`: an [`AbortController.signal` object](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal) that may be used to see if another part of the app logic has marked this request as needing cancelation.
  - `rejectWithValue`: rejectWithValue is a utility function that you can `return` in your action creator to return a rejected response with a defined payload. It will pass whatever value you give it and return it in the payload of the rejected action.

The logic in the `payloadCreator` function may use any of these values as needed to calculate the result.

## Return Value

`createAsyncThunk` returns a standard Redux thunk action creator. The thunk action creator function will have plain action creators for the `pending`, `fulfilled`, and `rejected` cases attached as nested fields.

When dispatched, the thunk will:

- dispatch the `pending` action
- call the `payloadCreator` callback and wait for the returned promise to settle
- when the promise settles:
  - if the promise resolved successfully, dispatch the `fulfilled` action with the promise value as `action.payload`
  - if the promise resolved with a `rejectWithValue(value)` return value, dispatch the `rejected` action with the value passed into `action.payload` and 'Rejected' as `action.error.message`
  - if the promise failed and was not handled with `rejectWithValue`, dispatch the `rejected` action with a serialized version of the error value as `action.error`
- Return a fulfilled promise containing the final dispatched action (either the `fulfilled` or `rejected` action object)

## Promise Lifecycle Actions

`createAsyncThunk` will generate three Redux action creators using [`createAction`](./createAction.md): `pending`, `fulfilled`, and `rejected`. Each lifecycle action creator will be attached to the returned thunk action creator so that your reducer logic can reference the action types and respond to the actions when dispatched. Each action object will contain the current unique `requestId` and `args` values under `action.meta`.

The action creators will have these signatures:

```typescript
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
    arg: ThunkArg
  }
}

interface FulfilledAction<ThunkArg, PromiseResult> {
  type: string
  payload: PromiseResult
  meta: {
    requestId: string
    arg: ThunkArg
  }
}

interface RejectedAction<ThunkArg> {
  type: string
  payload: undefined
  error: SerializedError | any
  meta: {
    requestId: string
    arg: ThunkArg
    aborted: boolean
  }
}

interface RejectedWithValueAction<ThunkArg, RejectedValue> {
  type: string
  payload: RejectedValue
  error: { message: 'Rejected' }
  meta: {
    requestId: string
    arg: ThunkArg
    aborted: boolean
  }
}

type Pending = <ThunkArg>(
  requestId: string,
  arg: ThunkArg
) => PendingAction<ThunkArg>

type Fulfilled = <ThunkArg, PromiseResult>(
  payload: PromiseResult,
  requestId: string,
  arg: ThunkArg
) => FulfilledAction<ThunkArg, PromiseResult>

type Rejected = <ThunkArg>(
  requestId: string,
  arg: ThunkArg
) => RejectedAction<ThunkArg>

type RejectedWithValue = <ThunkArg, RejectedValue>(
  requestId: string,
  arg: ThunkArg
) => RejectedWithValueAction<ThunkArg, RejectedValue>
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

## Cancellation

If you want to cancel your running thunk before it has finished, you can use the `abort` method of the promise returned by `dispatch(fetchUserById(userId))`.

A real-life example of that would look like this:

```ts
function MyComponent(props: { userId: string }) {
  React.useEffect(() => {
    // Dispatching the thunk returns a promise
    const promise = dispatch(fetchUserById(props.userId))
    return () => {
      // `createAsyncThunk` attaches an `abort()` method to the promise
      promise.abort()
    }
  }, [props.userId])
}
```

After a thunk has been cancelled this way, it will dispatch (and return) a `"thunkName/rejected"` action with an `AbortError` on the `error` property. The thunk will not dispatch any further actions.

Additionally, your `payloadCreator` can use the `AbortSignal` it is passed via `thunkApi.signal` to actually cancel a costly asynchronous action.

The `fetch` api of modern browsers already comes with support for an `AbortSignal`:

```ts
const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId, thunkAPI) => {
    const response = await fetch(`https://reqres.in/api/users/${userId}`, {
      signal: thunkAPI.signal
    })
    return await response.json()
  }
)
```

### Checking Cancellation Status

### Reading the Signal Value

You can use the `signal.aborted` property to regularly check if the thunk has been aborted and in that case stop costly long-running work:

```ts
const readStream = createAsyncThunk('readStream', async (stream: ReadableStream, {signal}) => {
  const reader = stream.getReader();

  let done = false;
  let result = "";

  while (!done) {
    if (signal.aborted) {
      throw new Error("stop the work, this has been aborted!");
    }
    const read = await reader.read();
    result += read.value;
    done = read.done;
  }
  return result;
}
```

#### Listening for Abort Events

You can also call `signal.addEventListener('abort', callback)` to have logic inside the thunk be notified when `promise.abort()` was called.
This can for example be used in conjunction with an axios `CancelToken`:

```ts
import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId, { signal }) => {
    const source = axios.CancelToken.source()
    signal.addEventListener('abort', () => {
      source.cancel()
    })
    const response = await axios.get(`https://reqres.in/api/users/${userId}`, {
      cancelToken: source.token
    })
    return response.data
  }
)
```

## Examples

- Requesting a user by ID, with loading state, and only one request at a time:

```js
import { createAsyncThunk, createSlice, unwrapResult } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'

const fetchUserById = createAsyncThunk(
  'users/fetchByIdStatus',
  async (userId, { getState, requestId }) => {
    const { currentRequestId, loading } = getState().users
    if (loading !== 'pending' || requestId !== currentRequestId) {
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
    currentRequestId: undefined,
    error: null
  },
  reducers: {},
  extraReducers: {
    [fetchUserById.pending]: (state, action) => {
      if (state.loading === 'idle') {
        state.loading = 'pending'
        state.currentRequestId = action.meta.requestId
      }
    },
    [fetchUserById.fulfilled]: (state, action) => {
      const { requestId } = action.meta
      if (state.loading === 'pending' && state.currentRequestId === requestId) {
        state.loading = 'idle'
        state.entities.push(action.payload)
        state.currentRequestId = undefined
      }
    },
    [fetchUserById.rejected]: (state, action) => {
      const { requestId } = action.meta
      if (state.loading === 'pending' && state.currentRequestId === requestId) {
        state.loading = 'idle'
        state.error = action.error
        state.currentRequestId = undefined
      }
    }
  }
})

const UsersComponent = () => {
  const { users, loading, error } = useSelector(state => state.users)
  const dispatch = useDispatch()

  const fetchOneUser = async userId => {
    try {
      const resultAction = await dispatch(fetchUserById(userId))
      const user = unwrapResult(resultAction)
      showToast('success', `Fetched ${user.name}`)
    } catch (err) {
      showToast('error', `Fetch failed: ${err.message}`)
    }
  }

  // render UI here
}
```

- Using rejectWithValue to access a custom rejected payload in a component

```js
import { createAsyncThunk, createSlice, unwrapResult } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'

const updateUser = createAsyncThunk(
  'users/update',
  async (userData, { rejectWithValue }) => {
    const { id, ...fields } = userData
    try {
      const response = await userAPI.updateById(id, fields)
      return response.data.user
    } catch (err) {
      // Note: this is an example assuming the usage of axios. Other fetching libraries would likely have different implementations
      if (!err.response) {
        throw err
      }

      return rejectWithValue(err.response.data)
    }
  }
)

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: {},
    error: null
  },
  reducers: {},
  extraReducers: {
    [updateUser.fullfilled]: (state, action) => {
      const user = action.payload
      state.entities[user.id] = user
    },
    [updateUser.rejected]: (state, action) => {
      if (action.payload) {
        // If a rejected action has a payload, it means that it was returned with rejectWithValue
        state.error = action.payload.errorMessage
      } else {
        state.error = action.error
      }
    }
  }
})

const UsersComponent = () => {
  const { users, loading, error } = useSelector(state => state.users)
  const dispatch = useDispatch()

  // This is an example of an onSubmit handler using Formik meant to demonstrate accessing the payload of the rejected action
  const handleUpdateUser = async (values, formikHelpers) => {
    const resultAction = await dispatch(updateUser(values))
    if (updateUser.fulfilled.match(resultAction)) {
      const user = unwrapResult(resultAction)
      showToast('success', `Updated ${user.name}`)
    } else {
      if (resultAction.payload) {
        // This is assuming the api returned a 400 error with a body of { errorMessage: 'Validation errors', field_errors: { field_name: 'Should be a string' } }
        formikHelpers.setErrors(resultAction.payload.field_errors)
      } else {
        showToast('error', `Update failed: ${resultAction.error}`)
      }
    }
  }

  // render UI here
}
```

- TypeScript: Using rejectWithValue to access a custom rejected payload in a component
  _Note: this is a contrived example assuming our userAPI only ever throws validation-specific errors_

```typescript
import { createAsyncThunk, createSlice, unwrapResult } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'
import { AppDispatch, RootState } from '../store'
import { FormikHelpers } from 'formik'

// Sample types that will be used
interface User {
  first_name: string
  last_name: string
  email: string
}

interface ValidationErrors {
  errorMessage: string
  field_errors: Record<string, string>
}

interface UpdateUserResponse {
  user: User
  success: boolean
}

const updateUser = createAsyncThunk<
  User,
  Partial<User>,
  {
    rejectValue: ValidationErrors
  }
>('users/update', async (userData, { rejectWithValue }) => {
  try {
    const { id, ...fields } = userData
    const response = await userAPI.updateById<UpdateUserResponse>(id, fields)
    return response.data.user
  } catch (err) {
    let error: AxiosError<ValidationErrors> = err // cast the error for access
    if (!error.response) {
      throw err
    }
    // We got validation errors, let's return those so we can reference in our component and set form errors
    return rejectWithValue(error.response.data)
  }
})

interface UsersState {
  error: string | null
  entities: Record<string, User>
}

const initialState: UsersState = {
  entities: {},
  error: null
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // The `builder` callback form is used here because it provides correctly typed reducers from the action creators
    builder.addCase(updateUser.fulfilled, (state, { payload }) => {
      state.entities[payload.id] = payload
    })
    builder.addCase(updateUser.rejected, (state, action) => {
      if (action.payload) {
        // Being that we passed in ValidationErrors to rejectType in `createAsyncThunk`, the payload will be available here.
        state.error = action.payload.errorMessage
      } else {
        state.error = action.error
      }
    })
  }
})

const UsersComponent = () => {
  const { users, loading, error } = useSelector(
    (state: RootState) => state.users
  )
  const dispatch: AppDispatch = useDispatch()

  // This is an example of an onSubmit handler using Formik meant to demonstrate accessing the payload of the rejected action
  const handleUpdateUser = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>
  ) => {
    const resultAction = await dispatch(updateUser(values))
    if (updateUser.fulfilled.match(resultAction)) {
      // user will have a type signature of User as we passed that as the Returned parameter in createAsyncThunk
      const user = unwrapResult(resultAction)
      showToast('success', `Updated ${user.name}`)
    } else {
      if (resultAction.payload) {
        // Being that we passed in ValidationErrors to rejectType in `createAsyncThunk`, those types will be available here.
        formikHelpers.setErrors(resultAction.payload.field_errors)
      } else {
        showToast('error', `Update failed: ${resultAction.error}`)
      }
    }
  }

  // render UI here
}
```
