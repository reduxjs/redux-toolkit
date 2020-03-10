---
id: quick-start
title: Quick Start
sidebar_label: Quick Start
hide_title: true
---

# Quick Start

## Purpose

The **Redux Toolkit** package is intended to be the standard way to write Redux logic. It was originally created to help address three common concerns about Redux:

- "Configuring a Redux store is too complicated"
- "I have to add a lot of packages to get Redux to do anything useful"
- "Redux requires too much boilerplate code"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app) and [`apollo-boost`](https://dev-blog.apollodata.com/zero-config-graphql-state-management-27b1f1b3c2c3), we can try to provide some tools that abstract over the setup process and handle the most common use cases, as well as include some useful utilities that will let the user simplify their application code.

This package is _not_ intended to solve every possible concern about Redux, and is deliberately limited in scope. It does _not_ address concepts like "reusable encapsulated Redux modules", data fetching, folder or file structures, managing entity relationships in the store, and so on.

That said, **these tools should be beneficial to all Redux users**. Whether you're a brand new Redux user setting up your
first project, or an experienced user who wants to simplify an existing application, **Redux Toolkit** can help
you make your Redux code better.

## What's Included

Redux Toolkit includes:

- A [`configureStore()` function](../api/configureStore.md) with simplified configuration options. It can automatically combine your slice reducers, adds whatever Redux middleware you supply, includes `redux-thunk` by default, and enables use of the Redux DevTools Extension.
- A [`createReducer()` utility](../api/createReducer.md) that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements. In addition, it automatically uses the [`immer` library](https://github.com/mweststrate/immer) to let you write simpler immutable updates with normal mutative code, like `state.todos[3].completed = true`.
- A [`createAction()` utility](../api/createAction.md) that returns an action creator function for the given action type string. The function itself has `toString()` defined, so that it can be used in place of the type constant.
- A [`createSlice()` function](../api/createSlice.md) that accepts a set of reducer functions, a slice name, and an initial state value, and automatically generates a slice reducer with corresponding action creators and action types.
- The [`createSelector` utility](../api/createSelector.md) from the [Reselect](https://github.com/reduxjs/reselect) library, re-exported for ease of use.

## Installation

Redux Toolkit is available as a package on NPM for use with a module bundler or in a Node application:

```bash
# NPM
npm install @reduxjs/toolkit

# Yarn
yarn add @reduxjs/toolkit
```

It is also available as a precompiled UMD package that defines a `window.RTK` global variable.
The UMD package can be used as a [`<script>` tag](https://unpkg.com/@reduxjs/toolkit/dist/redux-toolkit.umd.js) directly.

## Create a React Redux App

The recommended way to start new apps with React and Redux is by using the [official Redux+JS template](https://github.com/reduxjs/cra-template-redux) for [Create React App](https://github.com/facebook/create-react-app), which takes advantage of [Redux Toolkit](https://redux-toolkit.js.org/) and React Redux's integration with React components.

```sh
npx create-react-app my-app --template redux
cd my-app
npm start
```

## Help and Discussion

The **[#redux channel](https://discord.gg/0ZcbPKXt5bZ6au5t)** of the **[Reactiflux Discord community](http://www.reactiflux.com)** is our official resource for all questions related to learning and using Redux. Reactiflux is a great place to hang out, ask questions, and learn - come join us!

You can also ask questions on [Stack Overflow](https://stackoverflow.com) using the **[#redux tag](https://stackoverflow.com/questions/tagged/redux)**.
