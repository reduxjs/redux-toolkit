---
id: tutorials-overview
title: Tutorials Overview
sidebar_label: Tutorials Overview
hide_title: true
---

# Tutorials Overview

The Redux core docs site at https://redux.js.org contains the primary tutorials for using Redux, including how to use Redux Toolkit and React-Redux together.

:::tip

To avoid duplicating explanations between the Redux core and Redux Toolkit documentation, we've focused on making the Redux core docs tutorials comprehensive, and point to them instead of having additional tutorials here in the Redux Toolkit docs.

:::

See these linked tutorials to learn how to use Redux Toolkit effectively.

## Redux Essentials: A Real-World Example

The [**Redux Essentials tutorial**](https://redux.js.org/tutorials/essentials/part-1-overview-concepts) teaches you "how to use Redux the right way", using Redux Toolkit as the standard approach for writing Redux logic.

It shows how to build a "real world"-style example application, and teaches Redux concepts along the way.

**If you've never used Redux before, and just want to know "how do I use this to build something useful?", start with the Redux Essentials tutorial.**

## Redux Fundamentals: Redux from the Ground Up

The [**Redux Fundamentals tutorial**](https://redux.js.org/tutorials/fundamentals/part-1-overview) teaches "how Redux works, from the bottom up", by showing how to write Redux code by hand and why standard usage patterns exist. It then shows how Redux Toolkit simplifies those Redux usage patterns.

Since Redux Toolkit is an abstraction layer that wraps around the Redux core, it's helpful to know what RTK's APIs are actually doing for you under the hood. **If you want to understand how Redux really works and why RTK is the recommended approach, read the Redux Fundamentals tutorial.**

## Using Redux Toolkit

The RTK [**Usage Guide** docs page](../usage/usage-guide.md) explains the standard usage patterns for each of RTK's APIs. The [API Reference](../api/configureStore.mdx) section describes each API function and has additional usage examples.

The [Redux Essentials tutorial](https://redux.js.org/tutorials/essentials/part-1-overview-concepts) also shows how to use each of the APIs while building an application.

## Migrating Vanilla Redux to Redux Toolkit

If you already know Redux and just want to know how to migrate an existing application to use Redux Toolkit, the [**"Modern Redux with Redux Toolkit" page in the Redux Fundamentals tutorial**](https://redux.js.org/tutorials/fundamentals/part-8-modern-redux) shows how RTK's APIs simplify Redux usage patterns and how to handle that migration.

## Using Redux Toolkit with TypeScript

The RTK docs page on [**Usage with TypeScript**](../usage/usage-with-typescript.md) shows the basic pattern for setting up Redux Toolkit with TypeScript and React, and documents specific TS patterns for each of the RTK APIs.

In addition, the [Redux + TS template for Create-React-App](https://github.com/reduxjs/cra-template-redux-typescript) comes with RTK already configured to use those TS patterns, and serves as a good example of how this should work.
