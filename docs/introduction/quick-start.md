---
id: quick-start
title: Quick Start
sidebar_label: Quick Start
hide_title: true
---

# Quick Start

`RTK Query` is an advanced data fetching and caching tool, designed to simplify common cases for loading data in a web application. `RTK Query` itself is built on top of [Redux-Toolkit](https://redux-toolkit.js.org/) and uses [Redux](https://redux.js.org/) internally for its architecture. Although knowledge of Redux and RTK are not required to use this library, you should explore all of the additional global store management capabilities they provide, as well as installing the [devtools](https://github.com/reduxjs/redux-devtools).

`RTK Query` is currently in an alpha state of development, with the goal of eventually including it directly in the Redux Toolkit library.

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

### Create an API service

To get started as a very basic example, let's create a very simple service that queries the publicly available [PokeAPI](https://pokeapi.co/).

```ts title="src/services/pokemon.ts"
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name: string) => `pokemon/${name}`,
    }),
  }),
});

// Export hooks for usage in functional components
export const { hooks } = pokemonApi;
```

With `rtk-query`, you define your entire API definition in one place _in most cases_. This is most likely different from what you see with other libraries such as `swr` or `react-query`, and there are several reasons for that. Our perspective is that it's _much_ easier to keep track of how requests, cache invalidation, and general app configuration behave in one central location in comparison to having X number of custom hooks in different files throughout your application.

### Add the service to your store

```ts title="src/store.ts"
import { configureStore } from '@reduxjs/toolkit';
import { pokemonApi } from './services/pokemon';

export const store = configureStore({
  reducer: {
    [pokemonApi.reducerPath]: pokemonApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling and other features of `rtk-query`.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(pokemonApi.middleware),
});
```

### Wrap your application with the `Provider`

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
import { hooks } from './services/pokemon';

export default function App() {
  const { data, error } = hooks.getPokemonByName.useQuery('bulbasaur');

  return (
    <div className="App">
      {error ? (
        <>Oh no, there was an error</>
      ) : !data ? (
        <>Loading...</>
      ) : (
        <>
          <h3>{data.species.name}</h3>
          <img src={data.sprites.front_shiny} alt={data.species.name} />
        </>
      )}
    </div>
  );
}
```

When making a request, you're able to track the state in several ways. You can always check `data`, `status`, and `error` to determine the right UI to render. In addition, `useQuery` also provides utility booleans like `isLoading`, `isSuccess`, and `isError` for the latest request.

#### Basic Example

<iframe
  src="https://codesandbox.io/embed/getting-started-basic-17n8h?fontsize=14&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-getting-started-basic"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

Okay, that's interesting... but what if you wanted to show multiple pokemon at the same time? What happens if multiple components load the same pokemon?

#### Advanced example

`RTK Query` ensures that any component that subscribes to the same query will always use the same data. RTK Query automatically de-dupes requests so you don't have to worry about checking in-flight requests and performance optimizations on your end. Let's evaluate the sandbox below - make sure to check the Network panel in your browser's dev tools. You will see 3 requests, even though there are 4 subscribed components - `bulbasaur` only makes one request, and the loading state is synchronized between the two components. For fun, try changing the value of the dropdown from `Off` to `1s` to see this behavior continue when a query is re-ran.

<iframe
  src="https://codesandbox.io/embed/getting-started-advanced-8tx2b?file=/src/App.tsx?fontsize=14&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-getting-started-advanced"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

Those are the basics of getting up and running with `RTK Query`. For more realistic usage, make sure to read through the sections regarding [mutations](../concepts/mutations), [invalidation](../concepts/mutations#advanced-mutations-with-revalidation), [polling](../concepts/polling) and other features.

## Help and Discussion

The **[#redux channel](https://discord.gg/reactiflux)** of the **[Reactiflux Discord community](http://www.reactiflux.com)** is our official resource for all questions related to learning and using Redux. Reactiflux is a great place to hang out, ask questions, and learn - come join us!

You can also ask questions on [Stack Overflow](https://stackoverflow.com) using the **[#redux tag](https://stackoverflow.com/questions/tagged/redux)**.
