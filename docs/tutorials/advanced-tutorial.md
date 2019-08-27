---
id: advanced-tutorial
title: Advanced Tutorial
sidebar_label: Advanced Tutorial
hide_title: true
---

# Advanced Tutorial: Redux Starter Kit in Practice

in the [Intermediate Tutorial](./intermediate-tutorial.md), you saw how to use Redux Starter Kit in a typical basic React app, as well as how to convert some existing plain Redux code to use RSK instead. You also saw how to write "mutative" immutable updates in reducer functions, and how to write a "prepare callback" to generate an action payload.

In this tutorial, you'll see how to use Redux Starter Kit as part of a larger "real world" app that is bigger than a todo list example. This tutorial will show several concepts:

- How to convert a "plain React" app to use Redux
- How async logic like data fetching fits into RSK
- How to use RSK with TypeScript

In the process, we'll look at a few examples of TypeScript techniques you can use to improve your code, and we'll see how to use the new [React-Redux hooks APIs](https://react-redux.js.org/api/hooks) as an alternative to [the traditional `connect` API](https://react-redux.js.org/api/connect).

> **Note**: This is not a complete tutorial on how to use TypeScript in general or with Redux specifically, and the examples shown here do not try to achieve 100% complete type safety. For further information, please refer to community resources such as the [React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet) and the [React/Redux TypeScript Guide](https://github.com/piotrwitek/react-redux-typescript-guide).
>
> In addition, this tutorial does not mean you _must_ convert your React app logic completely to Redux. [It's up to you to decide what state should live in React components, and what should be in Redux](https://redux.js.org/faq/organizing-state#do-i-have-to-put-all-my-state-into-redux-should-i-ever-use-reacts-setstate). This is just an example of how you _could_ convert logic to use Redux if you choose to.

The complete source code for the converted application from this tutorial is available at [github.com/markerikson/rsk-github-issues-example](https://github.com/markerikson/rsk-github-issues-example). We'll be walking through the conversion process as shown in this repo's history. Links to meaningful individual commits will be highlighted in quote blocks, like this:

> - Commit message here

## Reviewing the Starting Example Application

The example application for this tutorial is a Github Issues viewer app. It allows the user to enter the names of a Github org and repositry, fetch the current list of open issues, page through the issues list, and view the contents and comments of a specific issue.

The starting commit for this application is a plain React implementation that uses function components with hooks for state and side effects like data fetching. The code is already written in TypeScript, and the styling is done via CSS Modules.

Let's start by viewing the original plain React app in action:

<iframe src="https://codesandbox.io/embed/rsk-github-issues-example-myx9j?fontsize=14&view=preview" title="rsk-github-issues-example-01-plain-react" allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

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

Since this app doesn't yet use Redux at all, the first step is to install Redux Starter Kit and React-Redux. Since this is a TypeScript app, we'll also need to add `@types/react-redux` as well. Add those packages to the project via either Yarn or NPM.

> - [Add Redux Starter Kit and React-Redux packages]()

Next, we need to set up the usual pieces: a root reducer function, the Redux store, and the `<Provider>` to make that store available to our component tree.

In the process, we're going to set up "Hot Module Replacement" for our app. That way, whenever we make a change to the reducer logic or the component tree, Create-React-App will rebuild the app and swap the changed code into our running app, without having to completely refresh the page.

#### Creating the Root Reducer

> - [Add store and root reducer with reducer HMR]()

First, we'll create the root reducer function. We don't have any slices yet, so it will just return an empty object.

However, we're going to want to know what the TypeScript type is for that root state object, because we need to declare what the type of the `state` variable is whenever our code needs to access the Redux store state (such as in `mapState` functions, `useSelector` selectors, and `getState` in thunks).

We could manually write a TS type with the correct types for each state slice, but we'd have to keep updating that type every time we make any change to the state structure in our slices. Fortunately, TS is usually pretty good at inferring types from the code we've already written. In this case, we can define a type that says "this type is whatever gets returned from `rootReducer`", and TS will automatically figure out whatever that contains as the code is changed. If we export that type, other parts of the app can use it, and we know that it's up to date. All we have to do is use the built-in TS `ReturnType` utility type, and feed in "the type of the `rootReducer` function" as its generic argument.

**app/rootReducer.ts**

```ts
import { combineReducers } from 'redux-starter-kit'

const rootReducer = combineReducers({})

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer
```

#### Store Setup and HMR

Next, we'll create the store instance, including hot-reloading the root reducer. By using the [`module.hot` API for reloading](), we can re-import the new version of the root reducer function whenever it's been recompiled, and tell the store to use the new version instead.

**app/store.ts**

```ts
import { configureStore } from 'redux-starter-kit'

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

> - [Render Redux Provider with app HMR]()

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

> - [Add initial state slice for UI display]()

**features/issuesDisplay/issuesDisplaySlice.ts**

```ts
import { createSlice, PayloadAction } from 'redux-starter-kit'

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
  slice: 'issuesDisplay',
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

The "current display" part requires a bit of extra work, because the type listed for the state includes a page number, but the UI won't include one when dispatches an action to switch to the issues list. So, we define a separate type for that action's contents.

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
import { combineReducers } from 'redux-starter-kit'

+import issuesDisplayReducer from 'features/issuesDisplay/issuesDisplaySlice'

-const rootReducer = combineReducers({})
+const rootReducer = combineReducers({
+ issuesDisplay: issuesDisplayReducer
+})
```

### Converting Issues Display

Now that the issues display slice is hooked up to the store, we can update `<App>` to use that instead of its internal component state.

> - [Convert main issues display control to Redux]()

We need to make three groups of changes to the `App` component:

- The `useState` declarations need to be removed
- The corresponding state values need to be read from the Redux store
- Redux actions need to be dispatched as the user interacts with the component

Traditionally, the last two aspects would be handled via the [React-Redux `connect` API](https://react-redux.js.org/api/connect). We'd write a `mapState` function to retrieve the data and a `mapDispatch` function to hold the action creators, pass those to `connect`, get everything as props, and then call `this.props.setCurrentPage()` to dispatch that action type.

However, [React-Redux now has a hooks API](https://react-redux.js.org/api/hooks), which allows us to interact with the store more directly. `useSelector` lets us read data from the store and subscribe to updates, and `useDispatch` gives us a reference to the store's `dispatch` method. We'll use those throughout the rest of this tutorial.

First, we'll import the necessary functions, plus the `RootState` type we declared earlier, and remove the hardcoded default org and repo strings.

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

<iframe src="https://codesandbox.io/embed/rsk-github-issues-example-m3jix?fontsize=14&module=%2Fsrc%2Fapp%2FApp.tsx&view=preview" title="rsk-github-issues-example-02-issues-display" allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

If you're thinking "hey, this looks and behaves exactly like the previous example"... then that's great! That means we've correctly converted the first bit of logic to Redux so far. If you want to confirm that there's Redux logic running, try clicking the "Open in New Window" button and inspect the store in the Redux DevTools Extension.
