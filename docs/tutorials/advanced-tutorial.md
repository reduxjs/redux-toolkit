---
id: advanced-tutorial
title: Advanced Tutorial
sidebar_label: Advanced Tutorial
hide_title: true
---

# Advanced Tutorial: Redux Toolkit in Practice

In the [Intermediate Tutorial](./intermediate-tutorial.md), you saw how to use Redux Toolkit in a typical basic React app, as well as how to convert some existing plain Redux code to use RTK instead. You also saw how to write "mutative" immutable updates in reducer functions, and how to write a "prepare callback" to generate an action payload.

In this tutorial, you'll see how to use Redux Toolkit as part of a larger "real world" app that is bigger than a todo list example. This tutorial will show several concepts:

- How to convert a "plain React" app to use Redux
- How async logic like data fetching fits into RTK
- How to use RTK with TypeScript

In the process, we'll look at a few examples of TypeScript techniques you can use to improve your code, and we'll see how to use the new [React-Redux hooks APIs](https://react-redux.js.org/api/hooks) as an alternative to [the traditional `connect` API](https://react-redux.js.org/api/connect).

> **Note**: This is not a complete tutorial on how to use TypeScript in general or with Redux specifically, and the examples shown here do not try to achieve 100% complete type safety. For further information, please refer to community resources such as the [React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet) and the [React/Redux TypeScript Guide](https://github.com/piotrwitek/react-redux-typescript-guide).
>
> In addition, this tutorial does not mean you _must_ convert your React app logic completely to Redux. [It's up to you to decide what state should live in React components, and what should be in Redux](https://redux.js.org/faq/organizing-state#do-i-have-to-put-all-my-state-into-redux-should-i-ever-use-reacts-setstate). This is just an example of how you _could_ convert logic to use Redux if you choose to.

The complete source code for the converted application from this tutorial is available at [github.com/reduxjs/rtk-github-issues-example](https://github.com/reduxjs/rtk-github-issues-example). We'll be walking through the conversion process as shown in this repo's history. Links to meaningful individual commits will be highlighted in quote blocks, like this:

> - Commit message here

## Reviewing the Starting Example Application

The example application for this tutorial is a Github Issues viewer app. It allows the user to enter the names of a Github org and repository, fetch the current list of open issues, page through the issues list, and view the contents and comments of a specific issue.

The starting commit for this application is a plain React implementation that uses function components with hooks for state and side effects like data fetching. The code is already written in TypeScript, and the styling is done via CSS Modules.

Let's start by viewing the original plain React app in action:

<iframe src="https://codesandbox.io/embed/rsk-github-issues-example-8jf6d?fontsize=14&hidenavigation=1&theme=dark&view=preview"
     style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-github-issues-example-01-plain-react"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

### React Codebase Source Overview

The codebase is already laid out in a "feature folder" structure, The main pieces are:

- `/api`: fetching functions and TS types for the Github Issues API
- `/app`: main `<App>` component
- `/components`: components that are reused in multiple places
- `/features`
  - `/issueDetails:` components for the Issue Details page
  - `/issuesList`: components for the Issues List display
  - `/repoSearch`: components for the Repo Search form
- `/utils`: various string utility functions

## Setting Up the Redux Store

Since this app doesn't yet use Redux at all, the first step is to install Redux Toolkit and React-Redux. Since this is a TypeScript app, we'll also need to add `@types/react-redux` as well. Add those packages to the project via either Yarn or NPM.

> - [Add Redux Toolkit and React-Redux packages](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_Redux_Toolkit_and_React-Redux_packages~1..reduxjs:Add_Redux_Toolkit_and_React-Redux_packages)

Next, we need to set up the usual pieces: a root reducer function, the Redux store, and the `<Provider>` to make that store available to our component tree.

In the process, we're going to set up "Hot Module Replacement" for our app. That way, whenever we make a change to the reducer logic or the component tree, Create-React-App will rebuild the app and swap the changed code into our running app, without having to completely refresh the page.

#### Creating the Root Reducer

> - [Add store and root reducer with reducer HMR](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_store_and_root_reducer_with_reducer_HMR~1..reduxjs:Add_store_and_root_reducer_with_reducer_HMR)

First, we'll create the root reducer function. We don't have any slices yet, so it will just return an empty object.

However, we're going to want to know what the TypeScript type is for that root state object, because we need to declare what the type of the `state` variable is whenever our code needs to access the Redux store state (such as in `mapState` functions, `useSelector` selectors, and `getState` in thunks).

We could manually write a TS type with the correct types for each state slice, but we'd have to keep updating that type every time we make any change to the state structure in our slices. Fortunately, TS is usually pretty good at inferring types from the code we've already written. In this case, we can define a type that says "this type is whatever gets returned from `rootReducer`", and TS will automatically figure out whatever that contains as the code is changed. If we export that type, other parts of the app can use it, and we know that it's up to date. All we have to do is use the built-in TS `ReturnType` utility type, and feed in "the type of the `rootReducer` function" as its generic argument.

**app/rootReducer.ts**

```ts
import { combineReducers } from '@reduxjs/toolkit'

const rootReducer = combineReducers({})

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer
```

> **Note:** For other ways to infer the `RootState`, view the [Usage with TypeScript](../usage/usage-with-typescript#getting-the-state-type) guide

#### Store Setup and HMR

Next, we'll create the store instance, including hot-reloading the root reducer. By using the [`module.hot` API for reloading](https://webpack.js.org/concepts/hot-module-replacement/), we can re-import the new version of the root reducer function whenever it's been recompiled, and tell the store to use the new version instead.

**app/store.ts**

```ts
import { configureStore } from '@reduxjs/toolkit'

import rootReducer from './rootReducer'

const store = configureStore({
  reducer: rootReducer
})

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./rootReducer', () => {
    const newRootReducer = require('./rootReducer').default
    store.replaceReducer(newRootReducer)
  })
}

export type AppDispatch = typeof store.dispatch

export default store
```

The `require('./rootReducer').default` looks a bit odd. That's because we're mixing CommonJS synchronous import syntax with ES modules, so the "default export" is in a object field called `default`. We could probably also have used `import()` and handled the reducer replacement asynchronously as well.

#### Rendering the `Provider`

Now that the store has been created, we can add it to the React component tree.

> - [Render Redux Provider with app HMR](https://github.com/reduxjs/rtk-github-issues-example/compare/Render_Redux_Provider_with_app_HMR~1..reduxjs:Render_Redux_Provider_with_app_HMR)

As with the root reducer, we can hot-reload the React component tree whenever a component file changes. The best way is to write a function that imports the `<App>` component and renders it, call that once on startup to show the React component tree as usual, and then reuse that function any time a component is changed.

**index.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import store from './app/store'

import './index.css'

const render = () => {
  const App = require('./app/App').default

  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById('root')
  )
}

render()

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./app/App', render)
}
```

## Converting the Main App Display

With the main store setup done, we can now start converting the actual app logic to use Redux.

### Evaluating the Existing App State

Currently, the top-level <`App>` component uses React `useState` hooks to store several pieces of info:

- The selected Github org and repo
- The current issues list page number
- Whether we're viewing the issues list, or the details for a specific issue

Meanwhile, the `<RepoSearchForm>` component also uses state hooks to store the work-in-progress values for the controlled form inputs.

The Redux FAQ has [some rules of thumb on when it makes sense to put data into Redux](https://redux.js.org/faq/organizing-state#do-i-have-to-put-all-my-state-into-redux-should-i-ever-use-reacts-setstate). In this case, it's reasonable to extract the state values from `<App>` and put those into the Redux store. While there's only one component that uses them now, a larger app might have multiple components that care about those values. Since we've set up HMR, it would also be helpful to persist those values if we make future edits to the component tree.

On the other hand, while we _could_ put the WIP form values into the Redux store, there's no real benefit to doing so. Only the `<RepoSearchForm>` component cares about those values, and none of the other rules of thumb apply here. In general, [most form state probably shouldn't be kept in Redux](https://redux.js.org/faq/organizing-state#should-i-put-form-state-or-other-ui-state-in-my-store). So, we'll leave that alone.

### Creating the Initial State Slices

The first step is to look at the data that is currently being kept in `<App>`, and turn that into the types and initial state values for our "issues display" slice. From there, we can define reducers to update them appropriately.

Let's look at the source for the whole slice, and then break down what it's doing:

> - [Add initial state slice for UI display](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_initial_state_slice_for_UI_display~1..reduxjs:Add_initial_state_slice_for_UI_display)

**features/issuesDisplay/issuesDisplaySlice.ts**

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CurrentDisplay {
  displayType: 'issues' | 'comments'
  issueId: number | null
}

interface CurrentDisplayPayload {
  displayType: 'issues' | 'comments'
  issueId?: number
}

interface CurrentRepo {
  org: string
  repo: string
}

type CurrentDisplayState = {
  page: number
} & CurrentDisplay &
  CurrentRepo

let initialState: CurrentDisplayState = {
  org: 'rails',
  repo: 'rails',
  page: 1,
  displayType: 'issues',
  issueId: null
}

const issuesDisplaySlice = createSlice({
  name: 'issuesDisplay',
  initialState,
  reducers: {
    displayRepo(state, action: PayloadAction<CurrentRepo>) {
      const { org, repo } = action.payload
      state.org = org
      state.repo = repo
    },
    setCurrentPage(state, action: PayloadAction<number>) {
      state.page = action.payload
    },
    setCurrentDisplayType(state, action: PayloadAction<CurrentDisplayPayload>) {
      const { displayType, issueId = null } = action.payload
      state.displayType = displayType
      state.issueId = issueId
    }
  }
})

export const {
  displayRepo,
  setCurrentDisplayType,
  setCurrentPage
} = issuesDisplaySlice.actions

export default issuesDisplaySlice.reducer
```

#### State Contents Type Declarations

The org and repo values are simple strings, and the current issues page is just a number. We will use a union of string constants to indicate if we're showing the issues list or the details of a single issue, and if it's the details, we need to know the issue ID number.

We can define types for a couple of those pieces by themselves for reuse in the action types later, and also combine them into a larger type for the entire state we plan to track.

The "current display" part requires a bit of extra work, because the type listed for the state includes a page number, but the UI won't include one when it dispatches an action to switch to the issues list. So, we define a separate type for that action's contents.

#### Declaring Types for Slice State and Actions

`createSlice` tries to infer types from two sources:

- The state type is based on the type of the `initialState` field
- Each reducer needs to declare the type of the action it expects to handle

The state type is used as the type for the `state` parameter in each of the case reducers and the return type for the generated reducer function, and the action types are used for the corresponding generated action creators. (Alternately, if you define a "prepare callback" alongside a reducer, the prepare callback's arguments are used for the action creator too, and the return value from the callback must match the declared type for the action the reducer expects.)

The main type you will use when declaring action types in reducers is **`PayloadAction<PayloadType>`**. `createAction` uses this type as its return value.

Let's look at a specific reducer as an example:

```ts
setCurrentPage(state, action: PayloadAction<number>) {
    state.page = action.payload
},
```

We don't have to declare a type for `state`, because `createSlice` already knows that this should be the same type as our `initialState`: the `CurrentDisplayState` type.

We declare that the action object is a `PayloadAction`, where `action.payload` is a `number`. Then, when we assign `state.page = action.payload`, TS knows that we're assigning a number to a number, and it works correctly. If we were to try calling `issuesDisplaySlice.actions.setCurrentPage()`, we would need to pass a number in as the argument, because that number will become the payload in the action.

Similarly, for `displayRepo(state, action: PayloadAction<CurrentRepo>)`, TS knows that `action.payload` is an object with `org` and `repo` string fields, and we can assign them to the state. (Remember that these "mutative" assignments are only safe and possible because `createSlice` uses Immer inside!)

#### Using the Slice Reducer

As with other examples, we then need to import and add the issues display slice reducer to our root reducer:

**app/rootReducer.ts**

```diff
import { combineReducers } from '@reduxjs/toolkit'

+import issuesDisplayReducer from 'features/issuesDisplay/issuesDisplaySlice'

-const rootReducer = combineReducers({})
+const rootReducer = combineReducers({
+ issuesDisplay: issuesDisplayReducer
+})
```

### Converting the Issues Display

Now that the issues display slice is hooked up to the store, we can update `<App>` to use that instead of its internal component state.

> - [Convert main issues display control to Redux](https://github.com/reduxjs/rtk-github-issues-example/compare/Convert_main_issues_display_control_to_Redux~1..reduxjs:Convert_main_issues_display_control_to_Redux)

We need to make three groups of changes to the `App` component:

- The `useState` declarations need to be removed
- The corresponding state values need to be read from the Redux store
- Redux actions need to be dispatched as the user interacts with the component

Traditionally, the last two aspects would be handled via the [React-Redux `connect` API](https://react-redux.js.org/api/connect). We'd write a `mapState` function to retrieve the data and a `mapDispatch` function to hold the action creators, pass those to `connect`, get everything as props, and then call `this.props.setCurrentPage()` to dispatch that action type.

However, [React-Redux now has a hooks API](https://react-redux.js.org/api/hooks), which allows us to interact with the store more directly. `useSelector` lets us read data from the store and subscribe to updates, and `useDispatch` gives us a reference to the store's `dispatch` method. We'll use those throughout the rest of this tutorial.

First, we'll import the necessary functions, plus the `RootState` type we declared earlier, and remove the hardcoded default org and repo strings.

**app/App.tsx**

```diff
import React, { useState } from 'react'
+import { useSelector, useDispatch } from 'react-redux'

+import { RootState } from './rootReducer'

import { RepoSearchForm } from 'features/repoSearch/RepoSearchForm'
import { IssuesListPage } from 'features/issuesList/IssuesListPage'
import { IssueDetailsPage } from 'features/issueDetails/IssueDetailsPage'

-const ORG = 'rails'
-const REPO = 'rails'
+import {
+  displayRepo,
+  setCurrentDisplayType,
+  setCurrentPage
+} from 'features/issuesDisplay/issuesDisplaySlice'

import './App.css'
```

Next, at the top of `App`, we'll remove the old `useState` hooks, and replace them with a call to `useDispatch` and `useSelector`:

```diff
const App: React.FC = () => {
- const [org, setOrg] = useState(ORG)
- const [repo, setRepo] = useState(REPO)
- const [page, setPage] = useState(1)
- const [currentDisplay, setCurrentDisplay] = useState<CurrentDisplay>({
-   type: 'issues'
- })
+ const dispatch = useDispatch()

+ const { org, repo, displayType, page, issueId } = useSelector(
+   (state: RootState) => state.issuesDisplay
+ )
```

We pass a "selector" function into `useSelector`, which is just a function that accepts our Redux store state as its parameter and returns some result. We declare that the type of the `state` argument is the `RootState` type we defined over in the root reducer, so that TS knows what fields are inside `state`. We can retrieve the `state.issuesDisplay` slice as one piece, and destructure the result object into multiple variables inside the component.

We now have mostly the same data variables inside the component as we did before - they're just coming from the Redux store instead of `useState` hooks.

The last step is to dispatch Redux actions whenever the user does something, instead of calling the `useState` setters:

```diff
  const setOrgAndRepo = (org: string, repo: string) => {
-   setOrg(org)
-   setRepo(repo)
+   dispatch(displayRepo({ org, repo }))
  }

  const setJumpToPage = (page: number) => {
-   setPage(page)
+   dispatch(setCurrentPage(page))
  }

  const showIssuesList = () => {
-   setCurrentDisplay({ type: 'issues' })
+   dispatch(setCurrentDisplayType({ displayType: 'issues' }))
  }

  const showIssueComments = (issueId: number) => {
-   setCurrentDisplay({ type: 'comments', issueId })
+   dispatch(setCurrentDisplayType({ displayType: 'comments', issueId }))
  }
```

Unlike typical `connect` + `mapDispatch` usage, here we call `dispatch()` directly, and do so by calling an action creator with the correct `payload` value and passing the resulting action to `dispatch`.

Let's see if this works!

<iframe  src="https://codesandbox.io/embed/rtk-github-issues-example-02-issues-display-tdx2w?fontsize=14&hidenavigation=1&module=%2Fsrc%2Fapp%2FApp.tsx&theme=dark&view=preview"
     style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-github-issues-example-02-issues-display"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

If you're thinking "hey, this looks and behaves exactly like the previous example"... then that's great! That means we've correctly converted the first bit of logic to Redux so far. If you want to confirm that there's Redux logic running, try clicking the "Open in New Window" button and inspect the store in the Redux DevTools Extension.

## Converting the Issues List Page

Our next task is to convert the `<IssuesListPage>` component to fetch and store issues via Redux. Currently, `<IssuesListPage>` is storing all data in `useState` hooks, including the fetched issues. It fetches the issues by making an AJAX call in a `useEffect` hook.

As mentioned at the start, there's nothing actually wrong with this! Having React components fetch and store their own data is totally fine. But, for the purposes of this tutorial, we want to see how the Redux conversion process looks.

### Reviewing the Issues List Component

Here's the initial chunk of `<IssuesListPage>`:

```ts
export const IssuesListPage = ({
  org,
  repo,
  page = 1,
  setJumpToPage,
  showIssueComments
}: ILProps) => {
  const [issuesResult, setIssues] = useState<IssuesResult>({
    pageLinks: null,
    pageCount: 1,
    issues: []
  })
  const [numIssues, setNumIssues] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [issuesError, setIssuesError] = useState<Error | null>(null)

  const { issues, pageCount } = issuesResult

  useEffect(() => {
    async function fetchEverything() {
      async function fetchIssues() {
        const issuesResult = await getIssues(org, repo, page)
        setIssues(issuesResult)
      }

      async function fetchIssueCount() {
        const repoDetails = await getRepoDetails(org, repo)
        setNumIssues(repoDetails.open_issues_count)
      }

      try {
        await Promise.all([fetchIssues(), fetchIssueCount()])
        setIssuesError(null)
      } catch (err) {
        console.error(err)
        setIssuesError(err)
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)

    fetchEverything()
  }, [org, repo, page])

  // omit rendering
}
```

The `useEffect` callback defines an outer `async function fetchEverything()` and calls it immediately. This is because we can't declare the `useEffect` callback itself as async. React expects that the return value from a `useEffect` callback will be a cleanup function. Since all async functions return a `Promise` automatically, React would see that `Promise` instead, and that would prevent React from actually cleaning up correctly.

Inside, we define two more async functions to fetch issues and the open issues count, and call them both. We then wait for both functions to resolve successfully. (There's a few other ways we could have organized this logic, but this was sufficient for the example.)

### Thinking in Thunks

#### What is a "Thunk"?

The Redux core (ie, `createStore`) is completely synchronous. When you call `store.dispatch()`, the store runs the root reducer, saves the return value, runs the subscriber callbacks, and returns, with no pause. By default, any asynchronicity has to happen outside of the store.

But, what if you want to have async logic interact with the store by dispatching or checking the current store state? That's where [Redux middleware](https://redux.js.org/advanced/middleware) come in. They extend the store, and allow you to:

- Execute extra logic when any action is dispatched (such as logging the action and state)
- Pause, modify, delay, replace, or halt dispatched actions
- Write extra code that has access to `dispatch` and `getState`
- Teach `dispatch` how to accept other values besides plain action objects, such as functions and promises, by intercepting them and dispatching real action objects instead

The most common Redux middleware is [`redux-thunk`](https://github.com/reduxjs/redux-thunk). The word "thunk" means "a function that delays a calculation until later". In our case, adding the thunk middleware to our Redux store lets us pass functions directly to `store.dispatch()`. The thunk middleware will see the function, prevent it from actually reaching the "real" store, and call our function and pass in `dispatch` and `getState` as arguments. So, a "thunk function" looks like this:

```js
function exampleThunkFunction(dispatch, getState) {
  // do something useful with dispatching or the store state here
}

// normally an error, but okay if the thunk middleware is added
store.dispatch(exampleThunkFunction)
```

Inside of a thunk function, you can write any code you want. The most common usage would be fetching some data via an AJAX call, and dispatching an action to load that data into the Redux store. The `async/await` syntax makes it easier to write thunks that do AJAX calls.

Normally, we don't write action objects directly in our code - we use action creator functions to make them, and use them like `dispatch(addTodo())`. In the same way, we typically write "thunk action creator" functions that return the thunk functions, like:

```js
function exampleThunk() {
  return function exampleThunkFunction(dispatch, getState) {
    // do something useful with dispatching or the store state here
  }
}

// normally an error, but okay if the thunk middleware is added
store.dispatch(exampleThunk())
```

#### Why Use Thunks?

You might be wondering what the point of all this is. There's a few reasons to use thunks:

- Thunks allow us to write reusable logic that interacts with _a_ Redux store, but without needing to reference a specific store instance.
- Thunks enable us to move more complex logic outside of our components
- From a component's point of view, it doesn't care whether it's dispatching a plain action or kicking off some async logic - it just calls `dispatch(doSomething())` and moves on.
- Thunks can return values like promises, allowing logic inside the component to wait for something else to finish.

For further explanations, see [these articles explaining thunks in the `redux-thunk` documentation](https://github.com/reduxjs/redux-thunk#why-do-i-need-this).

There are many other kinds of Redux middleware that add async capabilities. The most popular are [`redux-saga`](https://redux-saga.js.org/), which uses generator functions, and [`redux-observable`](https://redux-observable.js.org/), which uses RxJS observables. For some comparisons, see the [Redux FAQ entry on "how do I choose an async middleware?"](https://redux.js.org/faq/actions#what-async-middleware-should-i-use-how-do-you-decide-between-thunks-sagas-observables-or-something-else).

However, while sagas and observables are useful, most apps do not need the power and capabilities they provide. So, **thunks are
the default recommended approach for writing async logic with Redux**.

#### Writing Thunks in Redux Toolkit

Writing thunk functions requires that the `redux-thunk` middleware be added to the store as part of the setup process. Redux Toolkit's `configureStore` function does automatically - [`thunk` is one of the default middleware](../api/getDefaultMiddleware.mdx).

However, Redux Toolkit does not currently provide any special functions or syntax for writing thunk functions. In particular, they cannot be defined as part of a `createSlice()` call. You have to write them separate from the reducer logic.

In a typical Redux app, thunk action creators are usually defined in an "actions" file, alongside the plain action creators. Thunks typically dispatch plain actions, such as `dispatch(dataLoaded(response.data))`.

Because we don't have separate "actions" files, it makes sense to write these thunks directly in our "slice" files. That way, they have access to the plain action creators from the slice, and it's easy to find where the thunk function lives.

### Logic for Fetching Github Repo Details

#### Adding a Reusable Thunk Function Type

Since the thunk middleware is already set up, we don't have to do any work there. However, the TypeScript types for thunks are kind of long and confusing, and we'd normally have to repeat the same type declaration for every thunk function we write.

Before we go any further, let's add a type declaration we can reuse instead.

> - [Add AppThunk type](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_AppThunk_type~1..reduxjs:Add_AppThunk_type)

**app/store.ts**

```diff
-import { configureStore } from '@reduxjs/toolkit'
+import { configureStore, Action } from '@reduxjs/toolkit'
+import { ThunkAction } from 'redux-thunk'

-import rootReducer from './rootReducer'
+import rootReducer, { RootState } from './rootReducer'

export type AppDispatch = typeof store.dispatch

+export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>
```

The `AppThunk` type declares that the "action" that we're using is specifically a thunk function. The thunk is customized with some additional type parameters:

1. Return value: the thunk doesn't return anything
2. State type for `getState`: returns our `RootState` type
3. "Extra argument": the thunk middleware can be customized to pass in an extra value, but we aren't doing that in this app
4. Action types accepted by `dispatch`: any action whose `type` is a string.

There are many cases where you would want different type settings here, but these are probably the most common settings. This way, we can avoid repeating that same type declaration every time we write a thunk.

#### Adding the Repo Details Slice

Now that we have that type, we can write a slice of state for fetching details on a repo.

> - [Add a slice for storing repo details](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_a_slice_for_storing_repo_details~1..reduxjs:Add_a_slice_for_storing_repo_details)

**features/repoSearch/repoDetailsSlice.ts**

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { AppThunk } from 'app/store'

import { RepoDetails, getRepoDetails } from 'api/githubAPI'

interface RepoDetailsState {
  openIssuesCount: number
  error: string | null
}

const initialState: RepoDetailsState = {
  openIssuesCount: -1,
  error: null
}

const repoDetails = createSlice({
  name: 'repoDetails',
  initialState,
  reducers: {
    getRepoDetailsSuccess(state, action: PayloadAction<RepoDetails>) {
      state.openIssuesCount = action.payload.open_issues_count
      state.error = null
    },
    getRepoDetailsFailed(state, action: PayloadAction<string>) {
      state.openIssuesCount = -1
      state.error = action.payload
    }
  }
})

export const {
  getRepoDetailsSuccess,
  getRepoDetailsFailed
} = repoDetails.actions

export default repoDetails.reducer

export const fetchIssuesCount = (
  org: string,
  repo: string
): AppThunk => async dispatch => {
  try {
    const repoDetails = await getRepoDetails(org, repo)
    dispatch(getRepoDetailsSuccess(repoDetails))
  } catch (err) {
    dispatch(getRepoDetailsFailed(err.toString()))
  }
}
```

The first part of this should look straightforward. We declare our slice state shape, the initial state value, and write a slice with reducers that store the open issues count or an error string, then export the action creators and reducer.

Down at the bottom, we have our first data fetching thunk. The important things to notice here are:

- **The thunk is defined separately from the slice**, since RTK currently has no special syntax for defining thunks as part of a slice.
- **We declare the thunk action creator as an arrow function, and use the `AppThunk` type we just created.** You can use either arrow functions or the `function` keyword to write thunk functions and thunk action creators, so we could also have written this as `function fetchIssuesCount() : AppThunk` instead.
- **We use the `async/await` syntax for the thunk function itself.** Again, this isn't required, but `async/await` usually results in simpler code than nested Promise `.then()` chains.
- **Inside the thunk, we dispatch the plain action creators that were generated by the `createSlice` call**.

While not shown, we also add the slice reducer to our root reducer.

#### Async Error Handling Logic in Thunks

There is one potential flaw with the `fetchIssuesCount()` thunk as written. The `try/catch` block will currently catch any errors thrown
by `getRepoDetails()` (such as an actual failed AJAX call), but it will also catch any errors that occur inside the dispatch of `getRepoDetailsSuccess()`. In both cases, it will end up dispatch `getRepoDetailsFailed()`. This may not be the desired way to handle errors, as it might show a misleading reason for what the actual error was.

There are some possible ways to restructure the code to avoid this problem. First, the `await` could be switched to a standard promise chain, with separate callbacks passed in for the success and failure cases:

```js
getRepoDetails(org, repo).then(
  // success callback
  repoDetails => dispatch(getRepoDetailsSuccess(repoDetails)),
  // error callback
  err => dispatch(getRepoDetailsFailed(err.toString()))
)
```

Or, the thunk could be rewritten to only dispatch if no errors were caught:

```ts
 let repoDetails
  try {
    repoDetails = await getRepoDetails(org, repo)
  } catch (err) {
    dispatch(getRepoDetailsFailed(err.toString()))
    return
  }
  dispatch(getRepoDetailsSuccess(repoDetails))
}
```

For sake of simplicity, we'll stick with the logic as-is for the rest of the tutorial.

### Fetching Repo Details in the Issues List

Now that the repo details slice exists, we can use it in the `<IssuesListPage>` component.

> - [Update IssuesListPage to fetch repo details via Redux](https://github.com/reduxjs/rtk-github-issues-example/compare/Update_IssuesListPage_to_fetch_repo_details_via_Redux~1..reduxjs:Update_IssuesListPage_to_fetch_repo_details_via_Redux)

**features/issuesList/IssuesListPage.tsx**

```diff
import React, { useState, useEffect } from 'react'
+import { useSelector, useDispatch } from 'react-redux'

-import { getIssues, getRepoDetails, IssuesResult } from 'api/githubAPI'
+import { getIssues, IssuesResult } from 'api/githubAPI'

+import { fetchIssuesCount } from 'features/repoSearch/repoDetailsSlice'
+import { RootState } from 'app/rootReducer'

// omit code

export const IssuesListPage = ({
  org,
  repo,
  page = 1,
  setJumpToPage,
  showIssueComments
}: ILProps) => {
+ const dispatch = useDispatch()

  const [issuesResult, setIssues] = useState<IssuesResult>({
    pageLinks: null,
    pageCount: 1,
    issues: []
  })
- const [numIssues, setNumIssues] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [issuesError, setIssuesError] = useState<Error | null>(null)
+ const openIssueCount = useSelector(
+   (state: RootState) => state.repoDetails.openIssuesCount
+ )

  useEffect(() => {
    async function fetchEverything() {
      async function fetchIssues() {
        const issuesResult = await getIssues(org, repo, page)
        setIssues(issuesResult)
      }

-     async function fetchIssueCount() {
-       const repoDetails = await getRepoDetails(org, repo)
-       setNumIssues(repoDetails.open_issues_count)
-     }

      try {
-       await Promise.all([fetchIssues(), fetchIssueCount()])
+       await Promise.all([
+         fetchIssues(),
+         dispatch(fetchIssuesCount(org, repo))
+       ])
        setIssuesError(null)
      } catch (err) {
        console.error(err)
        setIssuesError(err)
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)

    fetchEverything()
- }, [org, repo, page])
+ }, [org, repo, page, dispatch])
```

In `<IssuesListPage>`, we import the new `fetchIssuesCount` thunk, and rewrite the component to read the open issues count value from the Redux store.

Inside our `useEffect`, we drop the `fetchIssueCount` function, and dispatch `fetchIssuesCount` instead.

### Logic for Fetching Issues for a Repo

Next up, we need to replace the logic for fetching a list of open issues.

> - [Add a slice for tracking issues state](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_a_slice_for_tracking_issues_state~1..reduxjs:Add_a_slice_for_tracking_issues_state)

**features/issuesList/issuesSlice.ts**

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Links } from 'parse-link-header'

import { Issue, IssuesResult, getIssue, getIssues } from 'api/githubAPI'
import { AppThunk } from 'app/store'

interface IssuesState {
  issuesByNumber: Record<number, Issue>
  currentPageIssues: number[]
  pageCount: number
  pageLinks: Links | null
  isLoading: boolean
  error: string | null
}

const issuesInitialState: IssuesState = {
  issuesByNumber: {},
  currentPageIssues: [],
  pageCount: 0,
  pageLinks: {},
  isLoading: false,
  error: null
}

function startLoading(state: IssuesState) {
  state.isLoading = true
}

function loadingFailed(state: IssuesState, action: PayloadAction<string>) {
  state.isLoading = false
  state.error = action.payload
}

const issues = createSlice({
  name: 'issues',
  initialState: issuesInitialState,
  reducers: {
    getIssueStart: startLoading,
    getIssuesStart: startLoading,
    getIssueSuccess(state, { payload }: PayloadAction<Issue>) {
      const { number } = payload
      state.issuesByNumber[number] = payload
      state.isLoading = false
      state.error = null
    },
    getIssuesSuccess(state, { payload }: PayloadAction<IssuesResult>) {
      const { pageCount, issues, pageLinks } = payload
      state.pageCount = pageCount
      state.pageLinks = pageLinks
      state.isLoading = false
      state.error = null

      issues.forEach(issue => {
        state.issuesByNumber[issue.number] = issue
      })

      state.currentPageIssues = issues.map(issue => issue.number)
    },
    getIssueFailure: loadingFailed,
    getIssuesFailure: loadingFailed
  }
})

export const {
  getIssuesStart,
  getIssuesSuccess,
  getIssueStart,
  getIssueSuccess,
  getIssueFailure,
  getIssuesFailure
} = issues.actions

export default issues.reducer

export const fetchIssues = (
  org: string,
  repo: string,
  page?: number
): AppThunk => async dispatch => {
  try {
    dispatch(getIssuesStart())
    const issues = await getIssues(org, repo, page)
    dispatch(getIssuesSuccess(issues))
  } catch (err) {
    dispatch(getIssuesFailure(err.toString()))
  }
}

export const fetchIssue = (
  org: string,
  repo: string,
  number: number
): AppThunk => async dispatch => {
  try {
    dispatch(getIssueStart())
    const issue = await getIssue(org, repo, number)
    dispatch(getIssueSuccess(issue))
  } catch (err) {
    dispatch(getIssueFailure(err.toString()))
  }
}
```

This slice is a bit longer, but it's the same basic approach as before: write the slice with reducers that handle API call results, then write thunks that do the fetching and dispatch actions with those results. The only new and interesting bits in this slice are:

- Our "start fetching" and "fetch failed" reducer logic is the same for both the single issue and multiple issue fetch cases. So, we write those functions outside the slice once, then reuse them multiple times with different names inside the `reducers` object.
- The Github API returns an array of issue entries, but we [want to store the data in a "normalized" structure to make it easy to look up an issue by its number](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape). In this case, we use a plain object as a lookup table, by declaring that it is a `Record<number, Issue>`.

### Fetching Issues in the Issues List

Now we can finish converting the `<IssuesListPage>` component by swapping out the issues fetching logic.

> - [Update IssuesListPage to fetch issues data via Redux](https://github.com/reduxjs/rtk-github-issues-example/compare/Update_IssuesListPage_to_fetch_issues_data_via_Redux~1..reduxjs:Update_IssuesListPage_to_fetch_issues_data_via_Redux)

Let's look at the changes.

**features/issuesList/IssuesListPage.tsx**

```diff
-import React, { useState, useEffect } from 'react'
+import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

-import { getIssues, IssuesResult } from 'api/githubAPI'

import { fetchIssuesCount } from 'features/repoSearch/repoDetailsSlice'
import { RootState } from 'app/rootReducer'

import { IssuesPageHeader } from './IssuesPageHeader'
import { IssuesList } from './IssuesList'
import { IssuePagination, OnPageChangeCallback } from './IssuePagination'
+import { fetchIssues } from './issuesSlice'

// omit code

  const dispatch = useDispatch()

- const [issuesResult, setIssues] = useState<IssuesResult>({
-   pageLinks: null,
-   pageCount: 1,
-   issues: []
- })
- const [isLoading, setIsLoading] = useState<boolean>(false)
- const [issuesError, setIssuesError] = useState<Error | null>(null)
+ const {
+   currentPageIssues,
+   isLoading,
+   error: issuesError,
+   issuesByNumber,
+   pageCount
+ } = useSelector((state: RootState) => state.issues)


  const openIssueCount = useSelector(
    (state: RootState) => state.repoDetails.openIssuesCount
  )

- const { issues, pageCount } = issuesResult
+ const issues = currentPageIssues.map(
+   issueNumber => issuesByNumber[issueNumber]
+ )

  useEffect(() => {
-   async function fetchEverything() {
-     async function fetchIssues() {
-       const issuesResult = await getIssues(org, repo, page)
-       setIssues(issuesResult)
-     }
-
-     try {
-       await Promise.all([
-        fetchIssues(),
-        dispatch(fetchIssuesCount(org, repo))
-       ])
-       setIssuesError(null)
-     } catch (err) {
-       console.error(err)
-       setIssuesError(err)
-     } finally {
-       setIsLoading(false)
-     }
-   }
-
-    setIsLoading(true)
-
-    fetchEverything()
+    dispatch(fetchIssues(org, repo, page))
+    dispatch(fetchIssuesCount(org, repo))
  }, [org, repo, page, dispatch])
```

We remove the remaining `useState` hooks from `<IssuesListPage>`, add another `useSelector` to retrieve the actual issues data from the Redux store, and construct the list of issues to render by mapping over the "current page issue IDs" array to look up each issue object by its ID.

In our `useEffect`, we delete the rest of the data fetching logic that's directly in the component, and just dispatch both data fetching thunks.

This simplifies the logic in the component, but it didn't remove the work being done - it just moved it elsewhere. Again, it's not that either approach is "right" or "wrong" - it's just a question of where you want the data and the logic to live, and which approach is more maintainable for your app and situation.

## Converting the Issue Details Page

The last major chunk of work left in the conversion is the `<IssueDetailsPage>` component. Let's take a look at what it does.

### Reviewing the Issue Details Component

Here's the current first half of `<IssueDetailsPage>`, containing the state and data fetching:

```ts
export const IssueDetailsPage = ({
  org,
  repo,
  issueId,
  showIssuesList
}: IDProps) => {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsError, setCommentsError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchIssue() {
      try {
        setCommentsError(null)
        const issue = await getIssue(org, repo, issueId)
        setIssue(issue)
      } catch (err) {
        setCommentsError(err)
      }
    }

    fetchIssue()
  }, [org, repo, issueId])

  useEffect(() => {
    async function fetchComments() {
      if (issue !== null) {
        const comments = await getComments(issue.comments_url)
        setComments(comments)
      }
    }

    fetchComments()
  }, [issue])

  // omit rendering
}
```

It's very similar to `<IssuesListPage>`. We store the current displayed `Issue`, the fetched comments, and a potential error. We have `useEffect` hooks that fetch the current issue by its ID, and fetch the comments whenever the issue changes.

### Fetching the Current Issue

We conveniently already have the Redux logic for fetching a single issue - we wrote that already as part of `issuesSlice.ts`. So, we can immediately jump straight to using that here in `<IssueDetailsPage>`.

> - [Update IssueDetailsPage to fetch issue data via Redux](https://github.com/reduxjs/rtk-github-issues-example/compare/Update_IssueDetailsPage_to_fetch_issue_data_via_Redux~1..reduxjs:Update_IssueDetailsPage_to_fetch_issue_data_via_Redux)

**features/issueDetails/IssueDetailsPage.tsx**

```diff
import React, { useState, useEffect } from 'react'
+import { useSelector, useDispatch } from 'react-redux'
import ReactMarkdown from 'react-markdown'
import classnames from 'classnames'

import { insertMentionLinks } from 'utils/stringUtils'
-import { getIssue, getComments, Issue, Comment } from 'api/githubAPI'
+import { getComments, Comment } from 'api/githubAPI'
import { IssueLabels } from 'components/IssueLabels'
+import { RootState } from 'app/rootReducer'
+import { fetchIssue } from 'features/issuesList/issuesSlice'


export const IssueDetailsPage = ({
  org,
  repo,
  issueId,
  showIssuesList
}: IDProps) => {
- const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
- const [commentsError, setCommentsError] = useState<Error | null>(null)

+ const dispatch = useDispatch()

+ const issue = useSelector(
+   (state: RootState) => state.issues.issuesByNumber[issueId]
+ )

  useEffect(() => {
-   async function fetchIssue() {
-     try {
-       setCommentsError(null)
-       const issue = await getIssue(org, repo, issueId)
-       setIssue(issue)
-     } catch (err) {
-       setCommentsError(err)
-     }
-    }
-    fetchIssue()
+   if (!issue) {
+      dispatch(fetchIssue(org, repo, issueId))
+   }
+   // Since we may have the issue already, ensure we're scrolled to the top
+   window.scrollTo({ top: 0 })
- }, [org, repo, issueId])
+ }, [org, repo, issueId, issue, dispatch])
```

We continue the usual pattern. We drop the existing `useState` hooks, pull in `useDispatch` and the necessary state via `useSelector`, and dispatch the `fetchIssue` thunk to fetch data.

Interestingly, there's actually a bit of a change in behavior here. The original React code was storing the fetched issues in `<IssuesListPage>`, and `<IssueDetailsPage>` was always having to do a separate fetch for its own issue. Because we're now storing issues in the Redux store, most of the time the listed issue _should_ be already cached, and we don't even need to fetch it. Now, it's totally possible to do something similar with just React - all we'd have to do is pass the issue down from the parent component. Still, having that data in Redux makes it easier to do the caching.

(As an interesting side note: the original code always caused the page to jump back to the top, because the issue didn't exist during the first render, so there was no content. If the issue _does_ exist and we render it right away, the page may retain the scroll position from the issues list, so we have to enforce scrolling back to the top.)

### Logic for Fetching Comments

We have one more slice left to write - we need to fetch and store comments for the current issue.

> - [Add a slice for tracking comments data](https://github.com/reduxjs/rtk-github-issues-example/compare/Add_a_slice_for_tracking_comments_data~1..reduxjs:Add_a_slice_for_tracking_comments_data)

**features/issueDetails/commentsSlice.ts**

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Comment, getComments, Issue } from 'api/githubAPI'
import { AppThunk } from 'app/store'

interface CommentsState {
  commentsByIssue: Record<number, Comment[] | undefined>
  loading: boolean
  error: string | null
}

interface CommentLoaded {
  issueId: number
  comments: Comment[]
}

const initialState: CommentsState = {
  commentsByIssue: {},
  loading: false,
  error: null
}

const comments = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    getCommentsStart(state) {
      state.loading = true
      state.error = null
    },
    getCommentsSuccess(state, action: PayloadAction<CommentLoaded>) {
      const { comments, issueId } = action.payload
      state.commentsByIssue[issueId] = comments
      state.loading = false
      state.error = null
    },
    getCommentsFailure(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    }
  }
})

export const {
  getCommentsStart,
  getCommentsSuccess,
  getCommentsFailure
} = comments.actions
export default comments.reducer

export const fetchComments = (issue: Issue): AppThunk => async dispatch => {
  try {
    dispatch(getCommentsStart())
    const comments = await getComments(issue.comments_url)
    dispatch(getCommentsSuccess({ issueId: issue.number, comments }))
  } catch (err) {
    dispatch(getCommentsFailure(err))
  }
}
```

The slice should look pretty familiar at this point. Our main bit of state is a lookup table of comments keyed by an issue ID. After the slice, we add a thunk to fetch the comments for a given issue, and dispatch the action to save the resulting array in the slice.

### Fetching the Issue Comments

The final step is to swap the comments fetching logic in `<IssueDetailsPage>`.

> - [Update IssueDetailsPage to fetch comments via Redux](https://github.com/reduxjs/rtk-github-issues-example/compare/Update_IssueDetailsPage_to_fetch_comments_via_Redux~1..reduxjs:Update_IssueDetailsPage_to_fetch_comments_via_Redux)

**features/issueDetails/IssueDetailsPage.tsx**

```diff
-import React, { useState, useEffect } from 'react'
+import React, { useEffect } from 'react'
-import { useSelector, useDispatch } from 'react-redux'
+import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import ReactMarkdown from 'react-markdown'
import classnames from 'classnames'

import { insertMentionLinks } from 'utils/stringUtils'
-import { getComments, Comment } from 'api/githubAPI'
import { IssueLabels } from 'components/IssueLabels'
import { RootState } from 'app/rootReducer'
import { fetchIssue } from 'features/issuesList/issuesSlice'

import { IssueMeta } from './IssueMeta'
import { IssueComments } from './IssueComments'
+import { fetchComments } from './commentsSlice'

export const IssueDetailsPage = ({
  org,
  repo,
  issueId,
  showIssuesList
}: IDProps) => {
- const [comments, setComments] = useState<Comment[]>([])
- const [commentsError] = useState<Error | null>(null)
-
  const dispatch = useDispatch()

  const issue = useSelector(
    (state: RootState) => state.issues.issuesByNumber[issueId]
  )

+ const { commentsLoading, commentsError, comments } = useSelector(
+   (state: RootState) => {
+     return {
+       commentsLoading: state.comments.loading,
+       commentsError: state.comments.error,
+       comments: state.comments.commentsByIssue[issueId]
+     }
+   },
+   shallowEqual
+ )

// omit effect
  useEffect(() => {
-   async function fetchComments() {
-     if (issue) {
-       const comments = await getComments(issue.comments_url)
-       setComments(comments)
-     }
-   }
-   fetchComments()
+   if (issue) {
+     dispatch(fetchComments(issue))
+   }
- }, [issue])
+ }, [issue, dispatch])
```

We add another `useSelector` hook to pull out the current comments data. In this case, we need three different pieces: the loading flag, a potential error, and the actual comments array for this issue.

However, this leads to a performance problem. Every time this selector runs, it returns a new object: `{commentsLoading, commentsError, comments}`. **Unlike `connect`, `useSelector` relies on reference equality by default.** So, returning a new object will cause this component to rerender every time an action is dispatched, even if the comments are the same!

There's a few ways to fix this:

- We could write those as separate `useSelector` calls
- We could use a memoized selector, such as `createSelector` from Reselect
- We can use the React-Redux `shallowEqual` function to compare the results, so that the re-render only happens if the object's _contents_ have changed.

In this case, we'll add `shallowEqual` as the comparison function for `useSelector`.

## Summary

And with that, we're done! The entire Github Issues app should now be fetching its data via thunks, storing the data in Redux, and interacting with the store via React-Redux hooks. We have Typescript types for our Github API calls, the API types are being used for the Redux state slices, and the store state types are being used in our React components.

There's more that could be done to add more type safety if we wanted (like trying to constrain which possible action types can be passed to `dispatch`), but this gives us a reasonable "80% solution" without too much extra effort.

Hopefully you now have a solid understanding of how Redux Toolkit looks in a real world application.

Let's wrap this up with one more look at the complete source code and the running app:

<iframe src="https://codesandbox.io/embed/rtk-github-issues-example-03-final-ihttc?fontsize=14&hidenavigation=1&module=%2Fsrc%2Ffeatures%2FissueDetails%2FcommentsSlice.ts&theme=dark&view=editor"
     style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-github-issues-example03-final"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

**Now, go out there and build something cool!**
