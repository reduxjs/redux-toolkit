---
id: createApi
title: createApi
sidebar_label: createApi
hide_title: true
---

# `createApi`

The main point where you will define a service to use in your application.

## Parameters

`createApi` accepts a single configuration object parameter with the following options:

```ts no-transpile
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  entityTypes: readonly EntityTypes[];
  reducerPath: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<InternalQueryArgs>;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
  keepUnusedDataFor?: number;
```

### `baseQuery`

### `entityTypes`

Specifying entity types is optional, but you should define them so that they can be used for caching and invalidation. When defining an entity type, you will be able to add them with `provides` and invalidate them with `invalidates` when configuring (endpoints)[./#endpoints]

### `reducerPath`

The `reducerPath` is a _unique_ key that your service will be mounted to in your store.

### `serializeQueryArgs`

Accepts a custom function if you'd like to change the serialization behavior for any reason. By default, we do this:

```ts no-compile
function defaultSerializeQueryArgs(args: any, endpoint: string) {
  return `${endpoint}/${JSON.stringify(args)}`;
}
```

### `endpoints`

### `keepUnusedDataFor`

Defaults to 60. This is how long we'll keep your data cached for. If you change this, please note that it is in seconds, not ms.
