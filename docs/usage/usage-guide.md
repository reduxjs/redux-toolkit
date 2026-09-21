---
id: usage-guide
title: Usage Guide
sidebar_label: Usage Guide
hide_title: true
---

&nbsp;

# Usage Guide

Redux Toolkit is the standard way to write Redux logic. It includes the store setup, reducer creation, async logic, data fetching, and normalized state utilities that a typical Redux app needs, with good defaults and development checks built in.

This page is an overview of which Redux Toolkit API to reach for in each part of your app, with a short example of each and links to the full API reference and usage pages. It assumes you already know the Redux concepts covered in the [Redux Essentials tutorial](/tutorials/essentials/part-1-overview-concepts). If you're coming from a hand-written Redux codebase, [Migrating to Modern Redux](/usage/migrating-to-modern-redux) walks through converting each pattern to its Redux Toolkit equivalent.

## Store Setup

[`configureStore`](../api/configureStore.mdx) creates the Redux store. It accepts an options object instead of positional arguments, automatically calls `combineReducers` when given an object of slice reducers, adds the [thunk middleware](../api/getDefaultMiddleware.mdx) and the development-only [immutability](../api/immutabilityMiddleware.mdx) and [serializability](../api/serializabilityMiddleware.mdx) check middleware, and enables the Redux DevTools Extension.

The simplest setup is an object of slice reducers:

```ts
import { configureStore } from '@reduxjs/toolkit'
import usersReducer from '../features/users/usersSlice'
import postsReducer from '../features/posts/postsSlice'

export const store = configureStore({
  reducer: {
    users: usersReducer,
    posts: postsReducer,
  },
})
```

If you need to add middleware or enhancers, use the callback forms so the defaults stay in place:

```ts
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
import { loggerMiddleware } from './middleware/logger'
import { monitorReducersEnhancer } from './enhancers/monitorReducers'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(monitorReducersEnhancer),
})
```

The `reducer` object form only handles one level of nesting. For nested reducers, call `combineReducers` yourself, or use [`combineSlices`](../api/combineSlices.mdx), which also supports lazily injecting slice reducers for code-split apps.

For the full list of options, including `preloadedState` and DevTools configuration, see the [`configureStore` API reference](../api/configureStore.mdx). The Redux core docs have a longer walkthrough in [Configuring Your Store](/usage/configuring-your-store).

## Writing Reducers and Actions with `createSlice`

[`createSlice`](../api/createSlice.mdx) is the standard way to define a piece of Redux state, the reducer that updates it, and the action creators that trigger those updates. You give it a `name`, an `initialState`, and an object of "case reducer" functions. It generates an action type string and an action creator for each case reducer, and combines the case reducers into a single slice reducer:

```ts
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface Post {
  id: string
  title: string
}

const initialState: Post[] = []

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    postAdded(state, action: PayloadAction<Post>) {
      state.push(action.payload)
    },
    postRemoved(state, action: PayloadAction<string>) {
      return state.filter((post) => post.id !== action.payload)
    },
  },
})

// `postAdded` creates actions with type "posts/postAdded"
export const { postAdded, postRemoved } = postsSlice.actions
export default postsSlice.reducer
```

Case reducers run inside [Immer](https://immerjs.github.io/immer/), so they can "mutate" the `state` argument and Immer produces a correct immutable update. They can also return a new value instead. See [Writing Reducers with Immer](./immer-reducers.md) for how this works and the rules to follow.

Export the action creators and the reducer by name, as shown above, and import them where they're needed. Two things to keep in mind when organizing slices:

- **Action types are not exclusive to one slice.** Any slice can respond to any action via the `extraReducers` option. For example, several slices might reset their state when a `userLoggedOut` action is dispatched.
- **Two slice files that import each other's actions create a circular import**, and one of the imports will be `undefined` at module evaluation time. If two slices need to respond to the same action, define that action in a shared file with [`createAction`](../api/createAction.mdx) and import it into both slices.

[`createReducer`](../api/createReducer.mdx) and [`createAction`](../api/createAction.mdx) are the underlying pieces that `createSlice` uses. You can use them directly for a reducer that isn't tied to a slice, or for an action shared across slices. Action creators made by either API carry their type string as `actionCreator.type` and have a `.match()` method for type-safe checks. If you use one in a `switch` statement, compare against `actionCreator.type`, not the action creator itself:

```ts
import type { UnknownAction } from '@reduxjs/toolkit'

const reducer = (state = initialState, action: UnknownAction) => {
  switch (action.type) {
    // ❌ This is a function, not a string, and will never match
    case postAdded:
    // ✅ Compare against the generated type string
    case postAdded.type: {
      // ...
    }
  }
}
```

## Async Logic and Data Fetching

A Redux store is synchronous. Any async work, such as fetching data from a server, has to happen outside the reducers and dispatch plain actions when it has results. Redux Toolkit provides several APIs for this, depending on what the async work is.

### Fetching Server Data with RTK Query

For loading and caching data from a server, use [**RTK Query**](../rtk-query/overview.md). It is built into Redux Toolkit and handles the request lifecycle, caching, loading state, invalidation, and refetching for you. You define an "API slice" with endpoints, and it generates React hooks and thunks for each one, so you don't have to write thunks, reducers, or loading flags for data fetching:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface User {
  id: number
  name: string
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getUsers: build.query<User[], void>({
      query: () => 'users',
    }),
  }),
})

export const { useGetUsersQuery } = usersApi
```

See the [RTK Query Quick Start](../tutorials/rtk-query.mdx) for a complete setup and [RTK Query Overview](../rtk-query/overview.md) for how it fits into a Redux app.

### Other Async Logic with Thunks and `createAsyncThunk`

For async logic that isn't a straightforward server request, such as chaining several dispatches, checking state before deciding what to do, or calling browser APIs, write a [thunk](/usage/writing-logic-thunks). `configureStore` includes the thunk middleware by default. Thunks are usually written in the same file as the slice whose actions they dispatch.

If the thunk's job is "run a promise and record its pending, fulfilled, and rejected result in the store", use [`createAsyncThunk`](../api/createAsyncThunk.mdx). It generates the three lifecycle action types and a thunk that dispatches them around your promise:

```ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'
import type { User } from './types'

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId: number) => {
    const response = await userAPI.fetchById(userId)
    return response.data
  },
)

const usersSlice = createSlice({
  name: 'users',
  initialState: { entities: [] as User[], loading: 'idle' as 'idle' | 'pending' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = 'pending'
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = 'idle'
        state.entities.push(action.payload)
      })
  },
})

// Later, in a component or another thunk:
dispatch(fetchUserById(123))
```

The payload creator receives the thunk argument and a `thunkAPI` object with `dispatch`, `getState`, `extra`, `requestId`, `signal`, and `rejectWithValue`. The [`createAsyncThunk` API reference](../api/createAsyncThunk.mdx) covers error handling, cancellation, and conditional execution.

### Reacting to Actions with the Listener Middleware

[`createListenerMiddleware`](../api/createListenerMiddleware.mdx) runs logic in response to dispatched actions or state changes, outside of components and reducers. It's a lightweight alternative to sagas and observables for workflows like "when this action is dispatched, wait for that one, then do something", debouncing, or side effects that don't belong in a component. See the [listener middleware API reference](../api/createListenerMiddleware.mdx) for usage patterns and [Side Effects Approaches](/usage/side-effects-approaches) for how it compares to the other options.

## Managing Normalized Data

Relational or nested data is usually easiest to work with in a Redux store when it's [normalized](/usage/structuring-reducers/normalizing-state-shape): each type of item is stored in a lookup table keyed by ID, along with an array of IDs for ordering. Redux Toolkit's [`createEntityAdapter`](../api/createEntityAdapter.mdx) implements that `{ ids: [], entities: {} }` shape and generates reducer functions and selectors that work with it.

```ts
import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
} from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import { userAPI } from './userAPI'

interface User {
  id: number
  first_name: string
  last_name: string
}

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await userAPI.fetchAll()
  // response.data is User[]
  return response.data
})

export const updateUser = createAsyncThunk(
  'users/updateOne',
  async (arg: Partial<User> & { id: number }) => {
    const response = await userAPI.updateUser(arg)
    return response.data
  },
)

const usersAdapter = createEntityAdapter<User>({
  // Sort the `ids` array by last name. Omit `sortComparer` to keep insertion order.
  sortComparer: (a, b) => a.last_name.localeCompare(b.last_name),
})

// `getInitialState` returns `{ ids: [], entities: {} }`.
// Pass an object to add extra fields: `getInitialState({ loading: 'idle' })`
const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    // Adapter functions can be used directly as case reducers...
    userRemoved: usersAdapter.removeOne,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, usersAdapter.upsertMany)
    // ...or called inside a case reducer as "mutating" helpers
    builder.addCase(updateUser.fulfilled, (state, action) => {
      const { id, ...changes } = action.payload
      usersAdapter.updateOne(state, { id, changes })
    })
  },
})

export const { userRemoved } = usersSlice.actions
export default usersSlice.reducer

// `getSelectors` generates memoized selectors for the entity state.
// Rename them for readability when used in components.
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors((state: RootState) => state.users)
```

If your items don't use an `id` field, pass a `selectId` option: `createEntityAdapter<User>({ selectId: (user) => user.idx })`.

The adapter's `setAll`, `addMany`, and `upsertMany` functions accept either an array of items or an object already keyed by ID, so if you normalize an API response before it reaches the reducer (for example, with `normalizr` or by hand in a thunk), you can pass the result straight through. Several slices can each pick their own entity type out of the same fulfilled action's payload.

Note that the adapter's `updateOne`, `updateMany`, `upsertOne`, and `upsertMany` functions do shallow merges: a nested object in the incoming change replaces the whole existing nested object. They work best with flat, normalized items. See the [`createEntityAdapter` API reference](../api/createEntityAdapter.mdx) for the full list of CRUD functions and options, and [Redux Essentials, Part 6](/tutorials/essentials/part-6-performance-normalization) for a worked example.

## Working with Non-Serializable Data

One of the core usage principles for Redux is that [you should not put non-serializable values in state or actions](/style-guide/#do-not-put-non-serializable-values-in-state-or-actions).

However, like most rules, there are exceptions. There may be occasions when you have to deal with actions that need to accept non-serializable data. This should be done very rarely and only if necessary, and these non-serializable payloads shouldn't ever make it into your application state through a reducer.

The [serializability dev check middleware](../api/serializabilityMiddleware.mdx) will automatically warn anytime it detects non-serializable values in your actions or state. We encourage you to leave this middleware active to help avoid accidentally making mistakes. However, if you _do_ need to turn off those warnings, you can customize the middleware by configuring it to ignore specific action types, or fields in actions and state:

```js
configureStore({
  //...
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/action/type'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
})
```

### Persistence Libraries

Persistence libraries are a common source of non-serializable values, because they dispatch their own actions and some of them store values like timestamps or `Promise`s in the store. The examples below show how to configure the serializability check for the most common cases. They are configuration examples, not endorsements of any particular library.

### Use with Redux-Persist

:::info

[Redux-Persist](https://github.com/rt2zz/redux-persist) has been the most widely used persistence library for Redux, and it still works. However, its last release was v6.0.0 in 2019 and the repository has had no commits since 2021, so it is effectively unmaintained. If you're choosing a persistence library for a new project, also look at [`redux-remember`](https://github.com/zewish/redux-remember), which is actively maintained, persists selected slices to a key-value storage driver of your choice, is tested against Redux 5 and Redux Toolkit 2, and integrates as a store enhancer via `configureStore`'s `enhancers` option without needing any serializability check configuration.

:::

If using Redux-Persist, you should specifically ignore all the action types it dispatches:

```jsx
import { createRoot } from 'react-dom/client'
import { configureStore } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { PersistGate } from 'redux-persist/integration/react'

import App from './App'
import rootReducer from './reducers'

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

let persistor = persistStore(store)

const container = document.getElementById('root')

if (container) {
  const root = createRoot(container)

  root.render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
  )
}
```

Additionally, you can purge any persisted state by adding an extra reducer to the specific slice that you would like to clear when calling persistor.purge(). This is especially helpful when you are looking to clear persisted state on a dispatched logout action.

```ts
import { PURGE } from "redux-persist";

...
extraReducers: (builder) => {
    builder.addCase(PURGE, (state) => {
        customEntityAdapter.removeAll(state);
    });
}
```

It is also strongly recommended to blacklist any api(s) that you have configured with RTK Query. If the api slice reducer is not blacklisted, the api cache will be automatically persisted and restored which could leave you with phantom subscriptions from components that do not exist any more. Configuring this should look something like this:

```ts
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  blacklist: [pokemonApi.reducerPath],
}
```

See [Redux Toolkit #121: How to use this with Redux-Persist?](https://github.com/reduxjs/redux-toolkit/issues/121) and [Redux-Persist #988: non-serializable value error](https://github.com/rt2zz/redux-persist/issues/988#issuecomment-552242978) for further discussion.

### Use with React-Redux-Firebase

RRF includes timestamp values in most actions and state as of 3.x, but there are PRs that may improve that behavior as of 4.x.

A possible configuration to work with that behavior could look like:

```ts
import { configureStore } from '@reduxjs/toolkit'
import {
  getFirebase,
  actionTypes as rrfActionTypes,
} from 'react-redux-firebase'
import { constants as rfConstants } from 'redux-firestore'
import rootReducer from './rootReducer'

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // just ignore every redux-firebase and react-redux-firebase action type
          ...Object.keys(rfConstants.actionTypes).map(
            (type) => `${rfConstants.actionsPrefix}/${type}`,
          ),
          ...Object.keys(rrfActionTypes).map(
            (type) => `@@reactReduxFirebase/${type}`,
          ),
        ],
        ignoredPaths: ['firebase', 'firestore'],
      },
      thunk: {
        extraArgument: {
          getFirebase,
        },
      },
    }),
})

export default store
```
