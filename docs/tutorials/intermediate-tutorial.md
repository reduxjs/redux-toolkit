---
id: intermediate-tutorial
title: Intermediate Tutorial
sidebar_label: Intermediate Tutorial
hide_title: true
---

# Intermediate Tutorial: Redux Starter Kit in Action

In the [Basic Tutorial](./basic-tutorial.md), you saw the main API functions that are included in Redux Starter Kit, and some short examples of why and how to use them.  You also saw that you can use Redux and RSK from a plain JS script tag in an HTML page, without using React, NPM, Webpack, or any build tools.

In this tutorial, you'll see how to use those APIs in a small React app.  Specifically, we're going to convert the [original Redux "todos" example app](https://redux.js.org/introduction/examples#todos) to use RSK instead.

This will show several several concepts:

- How to convert "plain Redux" code to use RSK
- How to use RSK in a typical React+Redux app
- How some of the more powerful features of RSK can be used to simplify your Redux code

Also, while this isn't specific to RSK, we'll look at a couple ways you can improve your React-Redux code as well.

The complete source code for the converted application from this tutorial is available at [github.com/markerikson/rsk-convert-todos-example](https://github.com/markerikson/rsk-convert-todos-example).  We'll be walking through the conversion process as shown in this repo's history.


## Reviewing the Redux Todos Example

If we inspect [the current "todos" example source code](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src), we can observe a few things:

- The [`todos` reducer function](https://github.com/reduxjs/redux/blob/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/reducers/todos.js) is doing immutable updates "by hand", by copying nested JS objects and arrays
- The [`actions` file](https://github.com/reduxjs/redux/blob/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/actions/index.js) has hand-written action creator functions, and the action type strings are being duplicated between the actions file and the reducer files
- The React components are written using a strict version of the "container/presentational" pattern, where [the "presentational" components are in one folder](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/components), and the [Redux "container" connection definitions are in a different folder](https://github.com/reduxjs/redux/tree/9c9a4d2a1c62c9dbddcbb05488f8bd77d24c81de/examples/todos/src/containers)
- Some of the code isn't following some of the recommended Redux "best practices" patterns.  We'll look at some specific examples as we go through this tutorial.

On the one hand, this is a small example app.  It's meant to illustrate the basics of actually using React and Redux together, and not necessarily be used as "the right way" to do things in a full-scale production application.  On the other hand, most people will use patterns they see in docs and examples, and there's definitely room for improvement here.


## Initial Conversion Steps

### Adding Redux Starter Kit to the Project

I started by copying the Redux "todos" source code to a fresh Create-React-App project, and added Prettier to the project to help make sure the code is formatted consistently.  You can see [the initial commit here]().

In the Basic Tutorial, we just linked to Redux Starter Kit as an individual script tag.  But, in a typical application, you need to add RSK as a package dependency in your project.  This can be done with either the NPM or Yarn package managers:

```bash
# If you're using NPM:
npm install redux-starter-kit

# Or for Yarn:
yarn add redux-starter-kit
```

Once that's complete, you should add and commit the modified `package.json` file and the "lock file" from your package manager (`package-lock.json` for NPM, or `yarn.lock` for Yarn).

With that done, we can start to work on the code.

### Converting the Store to Use `configureStore`

Just like with the "counter" example, we can replace the plain Redux `createStore` function with RSK's `configureStore`.  This will automatically set up the Redux DevTools Extension for us.

The changes here are simple.  We update `src/index.js` to import `configureStore` instead of `createStore`, and replace the function call.  Remember that `configureStore` takes an options object as a parameter with named fields, so instead of passing `rootReducer` directly as the first parameter, we pass it as an object field named `reducer`:

```diff
import React from "react";
import { render } from "react-dom";
-import { createStore } from "redux";
+import { configureStore } from "redux-starter-kit";
import { Provider } from "react-redux";
import App from "./components/App";
import rootReducer from "./reducers";

-const store = createStore(rootReducer);
+const store = configureStore({
+   reducer: rootReducer,
+});
```

If you have [the Redux DevTools browser extension](https://github.com/zalmoxisus/redux-devtools-extension) installed, you should now be able to see the current state if you start the application in development mode and open the DevTools Extension.  It should look like this:

![01-redux-devtools-extension](assets/tutorials/intermediate/int-tut-01-redux-devtools.png)











# TODO:

- FSA
- prepare callbacks
- immutability
- "ducks"
- 