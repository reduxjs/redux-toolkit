What this is:

This is an experiment to create a generic api client based on (and potentially to be shipped with) redux toolkit that allows for effective querying of non-normalized api endpoints with some global caching & cache invalidation mechanisms.

# Basic usage:

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery, QueryStatus } from '@rtk-incubator/simple-query';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

interface SingleResponse<T> {
  data: T;
}

interface ListResponse<T> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: T[];
}

// api initialization
const api = createApi({
  reducerPath: 'testApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://reqres.in/api' }),
  entityTypes: [],
  endpoints: (builder) => ({
    listUsers: builder.query<ListResponse<User>, number | void>({
      query(page = 1) {
        return {
          queryString: `users?page=${page}`,
        };
      },
    }),
    getUser: builder.query<SingleResponse<User>, number>({
      query(id) {
        return {
          queryString: `users/${id}`,
        };
      },
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query(data) {
        return {
          queryString: `users`,
          method: 'POST',
          body: JSON.stringify(data),
        };
      },
    }),
    updateUser: builder.mutation<User, { id: number; patch: Partial<User> }>({
      query({ id, patch }) {
        return {
          queryString: `users/${id}`,
          method: 'PATCH',
          body: JSON.stringify(patch),
        };
      },
    }),
    deleteUser: builder.mutation<void, number>({
      query(id) {
        return {
          queryString: `users/${id}`,
          method: 'DELETE',
        };
      },
    }),
  }),
});

// store setup
const store = configureStore({
  reducer: {
    testApi: api.reducer, // "testApi" here has to match the `reducerPath` option for `createApi`
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// usage in a component
function DisplayUser({ id }: { id: number }) {
  const { status, data } = api.hooks.getUser.useQuery(id);
  const [updateUser, updateResult] = api.hooks.updateUser.useMutation();

  if (status === QueryStatus.pending) {
    return <p>loading...</p>;
  }
  return (
    <div>
      <p>
        first name: {data.data.first_name} <br />
        last name: {data.data.last_name} <br />
      </p>
      <button onClick={() => updateUser({ id, patch: { first_name: 'Alice' } })}>set first name to Alice</button>
    </div>
  );
}
```

This allows to easily query data from the server and send requests to the server using the hooks supplied by our `api`.

# basic invalidation

```diff
const api = createApi({
  reducerPath: 'testApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://reqres.in/api' }),
-  entityTypes: [],
+  entityTypes: ['User'],
  endpoints: (builder) => ({
    listUsers: builder.query<ListResponse<User>, number | void>({
      query(page = 1) {
        return {
          queryString: `users?page=${page}`,
        };
      },
+      provides: [{type: 'User'}]
    }),
    // ...
    createUser: builder.mutation<User, Partial<User>>({
      query(data) {
        return {
          queryString: `users`,
          method: 'POST',
          body: JSON.stringify(data),
        };
      },
+      invalidates: [{type: 'User'}]
    }),
```

Now, whenever the `createUser` mutation is triggered, all currently used queries that provide objects of type `User` will re-run.

# granular invalidation

```diff
const api = createApi({
  reducerPath: 'testApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://reqres.in/api' }),
  endpoints: (builder) => ({
    listUsers: builder.query<ListResponse<User>, number | void>({
      query(page = 1) {
        return {
          queryString: `users?page=${page}`,
        };
      },
-      provides: [{type: 'User'}]
+      provides: result => [...result.data.map(user => ({type: 'User', id: user.id} as const)), {type: 'User', id: 'LIST'}]
    }),
    getUser: builder.query<SingleResponse<User>, number>({
      query(id) {
        return {
          queryString: `users/${id}`,
        };
      },
-      provides: [{type: 'User'}]
+      provides: (_, arg) => [({type: 'User', id: arg})]
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query(data) {
        return {
          queryString: `users`,
          method: 'POST',
          body: JSON.stringify(data),
        };
      },
-      invalidates: [{type: 'User'}]
+      invalidates: [{type: 'User', id: 'LIST'}]
    }),
    updateUser: builder.mutation<User, { id: number; patch: Partial<User> }>({
      query({ id, patch }) {
        return {
          queryString: `users/${id}`,
          method: 'PATCH',
          body: JSON.stringify(patch),
        };
      },
-      invalidates: [{type: 'User'}]
+      invalidates: result => [{type: 'User', id: result.id}]
    }),
    deleteUser: builder.mutation<void, number>({
      query(id) {
        return {
          queryString: `users/${id}`,
          method: 'DELETE',
        };
      },
-      invalidates: [{type: 'User'}]
+      invalidates: (_, arg) => [({type: 'User', id: arg})]
    }),
```

notable things:

- `invalidates` and `provides` can both be an array of `{entity: string, id?: string|number}` or a callback that returns such an array. That function will be passed the result as the first argument and the argument originally passed into the `query` method as the second argument.
- `updateUser` and `deleteUser` will now invalidate only queries that provided entities with these specific ids
- likewise, `getUser` now provides an entity with a specific id
- `listUsers` now provides all entities with id from the fetch result. Also, it provides a User with the id `"LIST"`. This id is chosen arbitrarily. It enables `createUser` to invalidate all list-type queries - after all, depending of the sort order, that newly created user could show up in any of those lists.

# TODOS:

- [x] create a PR against RTK that adds .requestId to the returned promise
- [x] split up that monster file
- [ ] more useful tests
- [ ] think about invalidation after all subscribers for a query have unsubscibed (+60 seconds or so)
- [x] basic invalidation: when a mutation invalidates an entity type, refetch all queries that provided that type
- [x] advanced invalidation: differentiate between mutations invalidating all entities of a type or single entities vs queries providing a single entity/a number of unspecified entities
- [x] hooks should return a promise (requires RTK patch from above)
- [ ] add a condition that prevents a query from re-running when a second component subscribes to the same query with the same arguments
- [x] return a refetch function from useQuery that does said refetch
- [x] implement a skip option for useQuery to prevent fetching on initial render
