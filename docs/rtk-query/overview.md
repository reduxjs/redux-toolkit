---
id: overview
title: RTK Query Overview
sidebar_label: RTK Query Overview
hide_title: true
description: 'RTK Query > Overview: a summary of the RTK Query data caching API for Redux Toolkit'
---

&nbsp;

# RTK Query Overview

:::tip What You'll Learn

- What RTK Query is and what problems it solves
- What APIs are included in RTK Query
- Basic RTK Query usage

:::

**RTK Query** is a powerful data fetching and caching tool. It is designed to simplify common cases for loading data in a web application, **eliminating the need to hand-write data fetching & caching logic yourself**.

RTK Query is **an optional addon included in the Redux Toolkit package**, and its functionality is built on top of the other APIs in Redux Toolkit.

## Motivation

Web applications normally need to fetch data from a server in order to display it. They also usually need to make updates to that data, send those updates to the server, and keep the cached data on the client in sync with the data on the server. This is made more complicated by the need to implement other behaviors used in today's applications:

- Tracking loading state in order to show UI spinners
- Avoiding duplicate requests for the same data
- Optimistic updates to make the UI feel faster
- Managing cache lifetimes as the user interacts with the UI

The Redux core has always been very minimal - it's up to developers to write all the actual logic. That means that Redux has never included anything built in to help solve these use cases. The Redux docs have taught [some common patterns for dispatching actions around the request lifecycle to track loading state and request results](https://redux.js.org/tutorials/fundamentals/part-7-standard-patterns#async-request-status), and [Redux Toolkit's `createAsyncThunk` API](../api/createAsyncThunk.mdx) was designed to abstract that typical pattern. However, users still have to write significant amounts of reducer logic to manage the loading state and the cached data.

Over the last couple years, the React community has come to realize that **"data fetching and caching" is really a different set of concerns than "state management"**. While you can use a state management library like Redux to cache data, the use cases are different enough that it's worth using tools that are purpose-built for the data fetching use case.

RTK Query takes inspiration from other tools that have pioneered solutions for data fetching, like Apollo Client, React Query, Urql, and SWR, but adds a unique approach to its API design:

- The data fetching and caching logic is built on top of Redux Toolkit's `createSlice` and `createAsyncThunk` APIs
- Because Redux Toolkit is UI-agnostic, RTK Query's functionality can be used with any UI layer
- API endpoints are defined ahead of time, including how to generate query parameters from arguments and transform responses for caching
- RTK Query can also generate React hooks that encapsulate the entire data fetching process, provide `data` and `isLoading` fields to components, and manage the lifetime of cached data as components mount and unmount
- RTK Query provides "cache entry lifecycle" options that enable use cases like streaming cache updates via websocket messages after fetching the initial data
- We have early working examples of code generation of API slices from OpenAPI and GraphQL schemas
- Finally, RTK Query is completely written in TypeScript, and is designed to provide an excellent TS usage experience

## What's included

### APIs

RTK Query is included within the installation of the core Redux Toolkit package. It is available via either of the two entry points below:

```ts no-transpile
import { createApi } from '@reduxjs/toolkit/query'

/* React-specific entry point that automatically generates
   hooks corresponding to the defined endpoints */
import { createApi } from '@reduxjs/toolkit/query/react'
```

RTK Query includes these APIs:

- [`createApi()`](./api/createApi.mdx): The core of RTK Query's functionality. It allows you to define a set of endpoints describe how to retrieve data from a series of endpoints, including configuration of how to fetch and transform that data. In most cases, you should use this once per app, with "one API slice per base URL" as a rule of thumb.
- [`fetchBaseQuery()`](./api/fetchBaseQuery.mdx): A small wrapper around [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) that aims to simplify requests. Intended as the recommended `baseQuery` to be used in `createApi` for the majority of users.
- [`<ApiProvider />`](./api/ApiProvider.mdx): Can be used as a `Provider` if you **do not already have a Redux store**.
- [`setupListeners()`](./api/setupListeners.mdx): A utility used to enable `refetchOnMount` and `refetchOnReconnect` behaviors.

### Bundle Size

RTK Query adds a fixed one-time amount to your app's bundle size. Since RTK Query builds on top of Redux Toolkit and React-Redux, the added size varies depending on whether you are already using those in your app. The estimated min+gzip bundle sizes are:

- If you are using RTK already: ~9kb for RTK Query and ~2kb for the hooks.
- If you are not using RTK already:
  - Without React: 17 kB for RTK+dependencies+RTK Query
  - With React: 19kB + React-Redux, which is a peer dependency

Adding additional endpoint definitions should only increase size based on the actual code inside the `endpoints` definitions, which will typically be just a few bytes.

The functionality included in RTK Query quickly pays for the added bundle size, and the elimination of hand-written data fetching logic should be a net improvement in size for most meaningful applications.

## Basic Usage

### Create an API Slice

RTK Query is included within the installation of the core Redux Toolkit package. It is available via either of the two entry points below:

```ts
import { createApi } from '@reduxjs/toolkit/query'

/* React-specific entry point that automatically generates
   hooks corresponding to the defined endpoints */
import { createApi } from '@reduxjs/toolkit/query/react'
```

For typical usage with React, start by importing `createApi` and defining an "API slice" that lists the server's base URL and which endpoints we want to interact with:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Pokemon } from './types'

// Define a service using a base URL and expected endpoints
export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query<Pokemon, string>({
      query: (name) => `pokemon/${name}`,
    }),
  }),
})

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetPokemonByNameQuery } = pokemonApi
```

### Configure the Store

The "API slice" also contains an auto-generated Redux slice reducer and a custom middleware that manages suscription lifetimes. Both of those need to be added to the Redux store:

```ts
import { configureStore } from '@reduxjs/toolkit'
// Or from '@reduxjs/toolkit/query/react'
import { setupListeners } from '@reduxjs/toolkit/query'
import { pokemonApi } from './services/pokemon'

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [pokemonApi.reducerPath]: pokemonApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(pokemonApi.middleware),
})

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch)
```

### Use Hooks in Components

Finally, import the auto-generated React hooks from the API slice into your component file, and call the hooks in your component with any needed parameters. RTK Query will automatically fetch data on mount, re-fetch when parameters change, provide `{data, isFetching}` values in the result, and re-render the component as those values change:

```ts
import * as React from 'react'
import { useGetPokemonByNameQuery } from './services/pokemon'

export default function App() {
  // Using a query hook automatically fetches data and returns query values
  const { data, error, isLoading } = useGetPokemonByNameQuery('bulbasaur')
  // Individual hooks are also accessible under the generated endpoints:
  // const { data, error, isLoading } = pokemonApi.endpoints.getPokemonByName.useQuery('bulbasaur')
  
  // render UI based on data and loading state
}
```

## Further Information

See the [**RTK Query Quick Start tutorial**](../tutorials/rtk-query.mdx/) for examples of how to add RTK Query to a project that uses Redux Toolkit, set up an "API slice" with endpoint definitions, and how to use the auto-generated React hooks in your components.

The [**RTK Query usage guide section**](./usage/queries.mdx) has information on topics like [querying data](./usage/queries.mdx), [using mutations to send updates to the server](./usage/mutations.mdx), [streaming cache updates](./usage/streaming-updates.mdx), and much more.

The [**Examples page**](./usage/examples.mdx) has runnable CodeSandboxes that demonstrate topics like [making queries with GraphQL](./usage/examples.mdx#react-with-graphql), [authentication](./usage/examples.mdx#authentication), and even [using RTK Query with other UI libraries like Svelte](./usage/examples.mdx#svelte).
