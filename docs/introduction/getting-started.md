---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
hide_title: true
---

# Getting Started

RTK Query is an advanced data fetching and caching tool, designed to simplify common cases for loading data in a web application. RTK Query itself is built on top of [Redux Toolkit](https://redux-toolkit.js.org/) and uses [Redux](https://redux.js.org/) internally for its architecture. Although knowledge of Redux and RTK are not required to use this library, you should explore all of the additional global store management capabilities they provide, as well as installing the [Redux DevTools browser extension](https://github.com/reduxjs/redux-devtools).

RTK Query is **currently in an alpha state of development**, with the goal of eventually including it directly in the Redux Toolkit library. We encourage you to use it in personal projects, and suggest creating local development branches to try out in actual apps. While we believe the current alpha is stable enough to actually use this library in real code, it's likely that there will be breaking API changes as we iterate on the API design and feature set. We welcome feedback on how it works and ways we can improve the API to help finalize the design!

:::note
To use the [auto-generated React Hooks](../api/createApi#auto-generated-hooks) as shown below as a TypeScript user, you'll need to use TS4.1+.

For older versions of TS, you can use `api.endpoints.[endpointName].useQuery/useMutation`
:::

## Installation

```sh
yarn add @reduxjs/toolkit @rtk-incubator/rtk-query
```

Or with npm:

```sh
npm i @reduxjs/toolkit @rtk-incubator/rtk-query
```

If you're a React user, make sure that you've installed `react-redux`. If you're a TypeScript user, you should also install `@types/react-redux`.

## Setting up your store and API service

To see how RTK Query works, let's walk through a basic usage example.

### Create an API service

First, we'll create a service definition that queries the publicly available [PokeAPI](https://pokeapi.co/).

```ts title="src/services/pokemon.ts"
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

// highlight-start
// Define a service using a base URL and expected endpoints
export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name: string) => `pokemon/${name}`,
    }),
  }),
});
//highlight-end

// highlight-start
// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetPokemonByNameQuery } = pokemonApi;
// highlight-end
```

With RTK Query, you usually define your entire API definition in one place. This is most likely different from what you see with other libraries such as `swr` or `react-query`, and there are several reasons for that. Our perspective is that it's _much_ easier to keep track of how requests, cache invalidation, and general app configuration behave when they're all in one central location in comparison to having X number of custom hooks in different files throughout your application.

### Add the service to your store

An RTK service generates a "slice reducer" that should be included in the Redux root reducer, and a custom middleware that handles the data fetching. Both need to be added to the Redux store.

```ts title="src/store.ts"
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@rtk-incubator/rtk-query';
import { pokemonApi } from './services/pokemon';

export const store = configureStore({
  reducer: {
    // highlight-start
    // Add the generated reducer as a specific top-level slice
    [pokemonApi.reducerPath]: pokemonApi.reducer,
    // highlight-end
  },
  // highlight-start
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(pokemonApi.middleware),
  // highlight-end
});

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);
```

### Wrap your application with the `Provider`

If you haven't already done so, follow the standard pattern for providing the Redux store to the rest of your React application component tree:

```ts title="src/index.tsx"
import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import App from './App';
import { store } from './store';

const rootElement = document.getElementById('root');
render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
);
```

### Use the query in a component

Once a service has been defined, you can import the hooks to make a request.

```ts title="src/App.tsx"
import * as React from 'react';
// highlight-next-line
import { useGetPokemonByNameQuery } from './services/pokemon';

export default function App() {
  // highlight-start
  // Using a query hook automatically fetches data and returns query values
  const { data, error, isLoading } = useGetPokemonByNameQuery('bulbasaur');
  // highlight-end

  return (
    <div className="App">
      {error ? (
        <>Oh no, there was an error</>
      ) : isLoading ? (
        <>Loading...</>
      ) : data ? (
        <>
          <h3>{data.species.name}</h3>
          <img src={data.sprites.front_shiny} alt={data.species.name} />
        </>
      ) : null}
    </div>
  );
}
```

When making a request, you're able to track the state in several ways. You can always check `data`, `status`, and `error` to determine the right UI to render. In addition, `useQuery` also provides utility booleans like `isLoading`, `isFetching`, `isSuccess`, and `isError` for the latest request.

#### Basic Example

<iframe
  src="https://codesandbox.io/embed/getting-started-basic-17n8h?fontsize=12&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-getting-started-basic"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

Okay, that's interesting... but what if you wanted to show multiple pokemon at the same time? What happens if multiple components load the same pokemon?

#### Advanced example

RTK Query ensures that any component that subscribes to the same query will always use the same data. RTK Query automatically de-dupes requests so you don't have to worry about checking in-flight requests and performance optimizations on your end. Let's evaluate the sandbox below - make sure to check the Network panel in your browser's dev tools. You will see 3 requests, even though there are 4 subscribed components - `bulbasaur` only makes one request, and the loading state is synchronized between the two components. For fun, try changing the value of the dropdown from `Off` to `1s` to see this behavior continue when a query is re-ran.

<iframe
  src="https://codesandbox.io/embed/getting-started-advanced-8tx2b?file=/src/App.tsx?fontsize=12&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-getting-started-advanced"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

Those are the basics of getting up and running with RTK Query. For more realistic usage, make sure to read through the sections regarding [mutations](../concepts/mutations), [invalidation](../concepts/mutations#advanced-mutations-with-revalidation), [polling](../concepts/polling) and other features.

## Help and Discussion

The **[#redux channel](https://discord.gg/0ZcbPKXt5bZ6au5t)** of the **[Reactiflux Discord community](http://www.reactiflux.com)** is our official resource for all questions related to learning and using Redux. Reactiflux is a great place to hang out, ask questions, and learn - come join us!

You can also ask questions on [Stack Overflow](https://stackoverflow.com) using the **[#redux tag](https://stackoverflow.com/questions/tagged/redux)**.
