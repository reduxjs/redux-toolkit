---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
hide_title: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

&nbsp;

# Getting Started with Redux Toolkit

## Purpose

The **Redux Toolkit** package is intended to be the standard way to write [Redux](/) logic. It was originally created to help address three common concerns about Redux:

- "Configuring a Redux store is too complicated"
- "I have to add a lot of packages to get Redux to do anything useful"
- "Redux requires too much boilerplate code"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app), we can try to provide some tools that abstract over the setup process and handle the most common use cases, as well as include some useful utilities that will let the user simplify their application code.

Redux Toolkit also includes a powerful data fetching and caching capability that we've dubbed ["RTK Query"](#rtk-query). It's included in the package as a separate set of entry points. It's optional, but can eliminate the need to hand-write data fetching logic yourself.

**These tools should be beneficial to all Redux users**. Whether you're a brand new Redux user setting up your
first project, or an experienced user who wants to simplify an existing application, **Redux Toolkit** can help
you make your Redux code better.

## Installation

### Create a React Redux App

The recommended way to start new apps with React and Redux Toolkit is by using [our official Redux Toolkit + TS template for Vite](https://github.com/reduxjs/redux-templates), or by creating a new Next.js project using [Next's `with-redux` template](https://github.com/vercel/next.js/tree/canary/examples/with-redux).

Both of these already have Redux Toolkit and React-Redux configured appropriately for that build tool, and come with a small example app that demonstrates how to use several of Redux Toolkit's features.

```bash
# Vite with our Redux+TS template
# (using the `tiged` tool to clone and extract the template)
npx tiged reduxjs/redux-templates/packages/vite-template-redux my-app

# Next.js using the `with-redux` template
npx create-next-app --example with-redux my-app
```

For React Native, we have [an official Redux+TS template for Expo](https://github.com/reduxjs/redux-templates/tree/master/packages/expo-template-redux-typescript):

```bash
npx tiged reduxjs/redux-templates/packages/expo-template-redux-typescript my-app
```

### An Existing App

Redux Toolkit is available as a package on NPM for use with a module bundler or in a Node application:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm install @reduxjs/toolkit
```

If you need React bindings:

```bash
npm install react-redux
```

  </TabItem>
  <TabItem value="yarn" label="yarn" default>

```bash
yarn add @reduxjs/toolkit
```

If you need React bindings:

```bash
yarn add react-redux
```

  </TabItem>
</Tabs>

The package includes a precompiled browser ESM build that can be loaded from a `<script type="module">` tag. That build imports its dependencies by package name, so using it without a bundler also requires an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

<details>
<summary>Example: loading Redux Toolkit in the browser without a bundler</summary>

```html
<script type="importmap">
  {
    "imports": {
      "@reduxjs/toolkit": "https://unpkg.com/@reduxjs/toolkit@2.12.0/dist/redux-toolkit.browser.mjs",
      "immer": "https://unpkg.com/immer@11.1.16/dist/immer.production.mjs",
      "redux": "https://unpkg.com/redux@5.0.1/dist/redux.mjs",
      "redux-thunk": "https://unpkg.com/redux-thunk@3.1.0/dist/redux-thunk.mjs",
      "reselect": "https://unpkg.com/reselect@5.2.0/dist/reselect.mjs"
    }
  }
</script>
<script type="module">
  import { configureStore, createSlice } from '@reduxjs/toolkit'

  const counterSlice = createSlice({
    name: 'counter',
    initialState: { value: 0 },
    reducers: {
      incremented: (state) => {
        state.value += 1
      },
    },
  })

  const store = configureStore({
    reducer: counterSlice.reducer,
  })

  store.dispatch(counterSlice.actions.incremented())
  console.log(store.getState())
</script>
```

Pin the dependency versions to match your installed packages. If CDN URLs aren't an option (for example, in a browser extension), copy the files into your project and point the import map at those local paths instead.

</details>

## Requirements

### TypeScript

Redux Toolkit follows [DefinitelyTyped's policy](https://github.com/DefinitelyTyped/DefinitelyTyped#support-window) of supporting TypeScript versions released within the past two years. As of RTK 2.11, this means we support:

| RTK Version | Minimum TypeScript |
| ----------- | ------------------ |
| 2.x         | 5.4+               |
| 1.9.x       | 4.7+               |

<details>
<summary>Using an older TypeScript version?</summary>

If you're unable to upgrade TypeScript, RTK may still work with older versions, but you may encounter type errors or missing type inference. We strongly recommend upgrading to take advantage of improved type safety and developer experience.

</details>

## What's Included

Redux Toolkit includes these APIs:

- [`configureStore()`](../api/configureStore.mdx): wraps `createStore` to provide simplified configuration options and good defaults. It can automatically combine your slice reducers, adds whatever Redux middleware you supply, includes `redux-thunk` by default, and enables use of the Redux DevTools Extension.
- [`createReducer()`](../api/createReducer.mdx): that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements. In addition, it automatically uses the [`immer` library](https://github.com/immerjs/immer) to let you write simpler immutable updates with normal mutative code, like `state.todos[3].completed = true`.
- [`createAction()`](../api/createAction.mdx): generates an action creator function for the given action type string.
- [`createSlice()`](../api/createSlice.mdx): accepts an object of reducer functions, a slice name, and an initial state value, and automatically generates a slice reducer with corresponding action creators and action types.
- [`combineSlices()`](../api/combineSlices.mdx): combines multiple slices into a single reducer, and allows "lazy loading" of slices after initialisation.
- [`createAsyncThunk`](../api/createAsyncThunk.mdx): accepts an action type string and a function that returns a promise, and generates a thunk that dispatches `pending/fulfilled/rejected` action types based on that promise
- [`createEntityAdapter`](../api/createEntityAdapter.mdx): generates a set of reusable reducers and selectors to manage normalized data in the store
- The [`createSelector` utility](../api/createSelector.mdx) from the [Reselect](https://github.com/reduxjs/reselect) library, re-exported for ease of use.

## RTK Query

[**RTK Query**](../rtk-query/overview.md) is provided as an optional addon within the `@reduxjs/toolkit` package. It is purpose-built to solve the use case of data fetching and caching, supplying a compact, but powerful toolset to define an API interface layer for your app. It is intended to simplify common cases for loading data in a web application, eliminating the need to hand-write data fetching & caching logic yourself.

RTK Query is built on top of the Redux Toolkit core for its implementation, using [Redux](/) internally for its architecture. Although knowledge of Redux and RTK are not required to use RTK Query, you should explore all of the additional global store management capabilities they provide, as well as installing the [Redux DevTools browser extension](https://github.com/reduxjs/redux-devtools), which works flawlessly with RTK Query to traverse and replay a timeline of your request & cache behavior.

RTK Query is included within the installation of the core Redux Toolkit package. It is available via either of the two entry points below:

```ts no-transpile
import { createApi } from '@reduxjs/toolkit/query'

/* React-specific entry point that automatically generates
   hooks corresponding to the defined endpoints */
import { createApi } from '@reduxjs/toolkit/query/react'
```

### What's included

RTK Query includes these APIs:

- [`createApi()`](../rtk-query/api/createApi.mdx): The core of RTK Query's functionality. It allows you to define a set of endpoints and describe how to retrieve data from a series of endpoints, including configuration of how to fetch and transform that data. In most cases, you should use this once per app, with "one API slice per base URL" as a rule of thumb.
- [`fetchBaseQuery()`](../rtk-query/api/fetchBaseQuery.mdx): A small wrapper around [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) that aims to simplify requests. Intended as the recommended `baseQuery` to be used in `createApi` for the majority of users.
- [`<ApiProvider />`](../rtk-query/api/ApiProvider.mdx): Can be used as a `Provider` if you **do not already have a Redux store**.
- [`setupListeners()`](../rtk-query/api/setupListeners.mdx): A utility used to enable `refetchOnMount` and `refetchOnReconnect` behaviors.

See the [**RTK Query Overview**](../rtk-query/overview.md) page for more details on what RTK Query is, what problems it solves, and how to use it.

## Learn Redux

To learn how to use Redux Toolkit, start with the [**Redux Quick Start**](/tutorials/quick-start), then work through the [**Redux Essentials tutorial**](/tutorials/essentials/part-1-overview-concepts). The [**Tutorials Index**](/tutorials/index) lists all of the tutorials and video resources, and the [**Getting Started with Redux**](/introduction/getting-started) page has links for help and discussion.
