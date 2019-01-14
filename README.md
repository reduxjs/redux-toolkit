# Redux Starter Kit

[![build status](https://img.shields.io/travis/reduxjs/redux-starter-kit/master.svg?style=flat-square)](https://travis-ci.org/reduxjs/redux-starter-kit)

[![npm version](https://img.shields.io/npm/v/redux-starter-kit.svg?style=flat-square)](https://www.npmjs.com/package/redux-starter-kit)

**A simple set of tools to make using Redux easier**

`npm install redux-starter-kit`

(Special thanks to Github user @shotak for dona

**A simple set of tools to make using Redux easier**

`npm install redux-starter-kit`

(Special thanks to Github user @shotak for donating to the package name.)

### Purpose

The `redux-starter-kit` package is intended to help address three common complaints about Redux:

- "Configuring a Redux store is too complicated"
- "I have to add a lot of packages to get Redux to do anything useful"
- "Redux requires too much boilerplate code"

We can't solve every use case, but in the spirit of le complaint about Redux, and is deliberately limited in scope. It and _not_ address concepts like "reusable encapsulated Redux modules", data fetching, folder or file s, we can try to provide some tools that abstract over the setup process and handle the most common use cases, as well as include some useful utilities that will let the user simplify their application code.

This package is _not_ intended to solve every possible complaint about Redux, and is deliberately limited in scope. It does _not_ address concepts like "reusable encapsulated Redux modules", data fetching, folder or file structures, managing entity relationships in the store, and so on.

### What's Included

`redux-starter-kit` includes:

- A `configureStore()` function with simplified configuration options. It can automatically combine your slice reducers, adds whatever Redux middleware you supply, includes `redux-thunk` by default, and enables use of the Redux DevTools Extension.
- A `createReducer()` utility that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements. In addition, it automatically uses the e selector functions.
- An improved version of the wid to let you write simpler immutable updates with normal mutative code, like `state.todos[3].completed = true`.
- A `createAction()` utility that returns an action creator function for the given action type string. The function itself has `toString()` defined, so that it can be used in place of the type constant.
- A `createSlice()` function that accepts a set of reducer functions, a slice name, and an initial state value, and automatically generates corresponding action creators, types, and simple selector functions.
- An improved version of the widely used `createSelector` utility for creating memoized selector functions, which can accept string keypaths as "input selectors" (re-exported from the n for more updates!).

## Documentation

The `redux-starter-kit` docs are now published at **tent - check back soon for more **.

We're currently expanding and rewriting our docs content - check back soon for more updates!
