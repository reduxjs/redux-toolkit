---
id: advanced-tutorial
title: Advanced Tutorial
sidebar_label: Advanced Tutorial
hide_title: true
---

# Advanced Tutorial: Redux Starter Kit in Practice

in the [Intermediate Tutorial](./intermediate-tutorial.md), you saw how to use Redux Starter Kit in a typical basic React app, as well as how to convert some existing plain Redux code to use RSK instead.  You also saw how to write "mutative" immutable updates in reducer functions, and how to write a "prepare callback" to generate an action payload.

In this tutorial, you'll see how to use Redux Starter Kit as part of a larger "real world" app that is bigger than a todo list example.  This tutorial will show several concepts:

- How to convert a "plain React" app to use Redux 
- How async logic like data fetching fits into RSK
- How to use RSK with TypeScript

In the process, we'll look at a few examples of TypeScript techniques you can use to improve your code, and we'll see how to use the new [React-Redux hooks APIs](https://react-redux.js.org/api/hooks) as an alternative to [the traditional `connect` API](https://react-redux.js.org/api/connect).

> **Note**: This is not a complete tutorial on how to use TypeScript in general or with Redux specifically, and the examples shown here do not try to achieve 100% complete type safety.  For further information, please refer to community resources such as the [React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet) and the [React/Redux TypeScript Guide](https://github.com/piotrwitek/react-redux-typescript-guide).  
> 
> In addition, this tutorial does not mean you _must_ convert your React app logic completely to Redux.  [It's up to you to decide what state should live in React components, and what should be in Redux](https://redux.js.org/faq/organizing-state#do-i-have-to-put-all-my-state-into-redux-should-i-ever-use-reacts-setstate).  This is just an example of how you _could_ convert logic to use Redux if you choose to.


The complete source code for the converted application from this tutorial is available at [github.com/markerikson/rsk-github-issues-example](https://github.com/markerikson/rsk-github-issues-example). We'll be walking through the conversion process as shown in this repo's history. Links to meaningful individual commits will be highlighted in quote blocks, like this:

> - Commit message here


## Reviewing the Starting Example Application

The example application for this tutorial is a Github Issues viewer app.  It allows the user to enter the names of a Github org and repositry, fetch the current list of open issues, page through the issues list, and view the contents and comments of a specific issue.  

The starting commit for this application is a plain React implementation that uses function components with hooks for state and side effects like data fetching.  The code is already written in TypeScript, and the styling is done via CSS Modules.

Let's start by viewing the original plain React app in action:



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


## Initial Conversion Steps

### Setting Up the Redux Store

Since this app doesn't yet use Redux at all, the first step is to install Redux Starter Kit and React-Redux.  Since this is a TypeScript app, we'll also need to add `@types/react-redux` as well.  Add those packages to the project via either Yarn or NPM.

> - [Add Redux Starter Kit and React-Redux packages]()

Next, we need to set up the usual pieces: a root reducer function, the Redux store, and the `<Provider>` to make that store available to our component tree.

In the process, we're going to set up "Hot Module Replacement" for our app.  That way, whenever we make a change to the reducer logic or the component tree, Create-React-App will rebuild the app and swap the changed code into our running app, without having to completely refresh the page.

#### Creating the Root Reducer

> - [Add store and root reducer with reducer HMR]()

First, we'll create the root reducer function.  We don't have any slices yet, so it will just return an empty object.

However, we're going to want to know what the TypeScript type is for that root state object, because we need to declare what the type of the `state` variable is whenever our code needs to access the Redux store state (such as in `mapState` functions, `useSelector` selectors, and `getState` in thunks).

We could manually write a TS type with the correct types for each state slice, but we'd have to keep updating that type every time we make any change to the state structure in our slices.  Fortunately, TS is usually pretty good at inferring types from the code we've already written.  In this case, we can define a type that says "this type is whatever gets returned from `rootReducer`, and TS will automatically figure out whatever that contains as the code is changed.  If we export that type, other parts of the app can use that type, and we know it's up to date.  All we have to do is use the built-in TS `ReturnType` utility type, and feed in "the type of the `rootReducer` function as its generic argument.

**app/rootReducer.ts**

```ts
import { combineReducers } from 'redux-starter-kit'

const rootReducer = combineReducers({})

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer
```

#### Store Setup and HMR

Next, we'll create the store instance, including hot-reloading the root reducer.  By using the [`module.hot` API for reloading](), we can re-import the new version of the root reducer function whenever it's been recompiled, and tell the store to use the new version instead.

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

The `require('./rootReducer').default` looks a bit odd.  That's because we're mixing CommonJS synchronous import syntax with ES modules, so the "default export" is in a object field called `default`.  We could probably also have used `import()` and handled the reducer replacement asynchronously as well.

#### Rendering the `Provider`

Now that the store has been created, we can add it to the React component tree.

> - [Render Redux Provider with app HMR]()

As with the root reducer, we can hot-reload the React component tree whenever a component file changes.  The best way is to write a function that imports the `<App>` component and renders it, call that once on startup to show the React component tree as usual, and then reuse that function any time a component is changed.

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

