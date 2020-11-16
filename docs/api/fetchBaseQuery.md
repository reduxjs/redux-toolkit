---
id: fetchBaseQuery
title: fetchBaseQuery
sidebar_label: fetchBaseQuery
hide_title: true
hide_table_of_contents: false
---

# `fetchBaseQuery`

This is a very small wrapper around `fetch` that aims to simplify requests. It is not a full-blown replacement for `axios`, `superagent`, or any other more heavy-weight library, but it will cover the large majority of your needs.

It takes one argument with an option of `baseUrl`, which is typically a string like `https://api.your-really-great-app.com/v1/`. If you don't provide a `baseUrl`, it defaults to a relative path from where the request is being made. You should most likely _always_ specify this.

```ts
function fetchBaseQuery({
  baseUrl,
}?: {
  baseUrl?: string;
}): (arg: string | FetchArgs, { signal, rejectWithValue }: QueryApi) => Promise<any>;
```

### Using `fetchBaseQuery`

To use it, simply import it when you are [creating an API service definition](../introduction/quick-start#create-an-api-service).

```ts title="src/services/pokemon.ts"
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }), // Set the baseUrl for every endpoint below
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name: string) => `pokemon/${name}`, // Will make a request like https://pokeapi.co/api/v2/bulbasaur
    }),
    updatePokemon: builder.mutation({
        query: ({ name, patch }) => ({
          url: `pokemon/${name}`,
          method: 'PATCH', // When performing a mutation, you typically use a method of PATCH/PUT/POST/DELETE for REST endpoints
          body: patch, // fetchBaseQuery automatically adds `content-type: application/json` to the Headers and calls `JSON.stringify(patch)`
        })
      },
    })
  }),
});
```

### Individual query options

Even though `fetchBaseQuery` only takes an object with `baseUrl`, there is more behavior that you can define on a per-request basis.

```ts
interface FetchArgs extends RequestInit {
  url: string;
  params?: Record<string, any>;
  body?: any;
  responseHandler?: 'json' | 'text' | ((response: Response) => Promise<any>);
  validateStatus?: (response: Response, body: any) => boolean;
}

const defaultValidateStatus = (response: Response) => response.status >= 200 && response.status <= 299;
```

### Setting the body

By default, `fetchBaseQuery` assumes that every request you make will be `json`, so in those cases all you have to do is set the `url` and pass a `body` object when appropriate. For other implementations, you can manually set the `Headers` to specify the content type.

#### json

```ts
 // omitted
  endpoints: (builder) => ({
    updateUser: builder.query({
      query: (user: Record<string, string>) => ({
        url: `users`,
        method: 'PUT',
        body: user // Body is automatically converted to json with the correct headers
      }),
    }),
```

#### text

```ts
 // omitted
  endpoints: (builder) => ({
    updateUser: builder.query({
      query: (user: Record<string, string>) => ({
        url: `users`,
        method: 'PUT',
        headers: {
            'content-type': 'text/plain',
        },
        body: user
      }),
    }),
```

### Setting the query string

`fetchBaseQuery` provides a simple mechanism that converts an `object` to a serialized query string. If this doesn't suit your needs, you can always build your own querystring and set it in the `url`.

```ts
  endpoints: (builder) => ({
    updateUser: builder.query({
      query: (user: Record<string, string>) => ({
        url: `users`,
        params: user // The user object is automatically converted and produces a request like /api/users/?first_name=test&last_name=example
      }),
    }),
```

### Parsing a Response

By default, `fetchBaseQuery` assumes that every `Response` you get will be parsed as `json`. In the event that you don't want that to happen, you can specify an alternative response handler like `text`, or take complete control and use a custom function that accepts the raw `Response` object &mdash; allowing you to use any [`Body` method](https://developer.mozilla.org/en-US/docs/Web/API/Body).

```ts title="Parse a Response as text"
export const customApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({
        url: `users`,
        responseHandler: (response) => response.text(), // This is the same as passing 'text'
      }),
    }),
  }),
});
```

### Handling non-standard Response status codes

By default, `fetchBaseQuery` will `reject` any `Response` that does not have a status code of `2xx` and set it to `error`. This is the same behavior you've most likely experienced with `axios` and other popular libraries. In the event that you have a non-standard API you're dealing with, you can use the `validateStatus` option to customize this behavior.

```ts title="Using a custom validateStatus"
export const customApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }), // Set the baseUrl for every endpoint below
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({
        url: `users`,
        validateStatus: (response, result) => response.status === 200 && !result.isError, // Our tricky API always returns a 200, but sets an `isError` property when there is an error.
      }),
    }),
  }),
});
```
