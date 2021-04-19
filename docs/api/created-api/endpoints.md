---
id: endpoints
title: 'API Slices: Endpoints'
sidebar_label: Endpoints
hide_title: true
---

# API Slices: Endpoints

The API slice object will have an `endpoints` field inside. This section maps the endpoint names you provided to `createApi` to the core Redux logic (thunks and selectors) used to trigger data fetches and read cached data for that endpoint. If you're using the React-specific version of `createApi`, each endpoint definition will also contain the auto-generated React hooks for that endpoint.

Each endpoint structure contains the following fields:

```ts
type EndpointLogic = {
  initiate: InitiateRequestThunk;
  select: CreateCacheSelectorFactory;
  matchPending: Matcher<PendingAction>;
  matchFulfilled: Matcher<FulfilledAction>;
  matchRejected: Matcher<RejectedAction>;
};
```

## `initiate`

#### Signature

```ts
type InitiateRequestThunk = StartQueryActionCreator | StartMutationActionCreator;

type StartQueryActionCreator = (
  arg:any,
  options?: StartQueryActionCreatorOptions
) => ThunkAction<QueryActionCreatorResult, any, any, AnyAction>;

type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = (
  arg: any
  options?: StartMutationActionCreatorOptions
) => ThunkAction<MutationActionCreatorResult<D>, any, any, AnyAction>;

type SubscriptionOptions = {
  /**
   * How frequently to automatically re-fetch data (in milliseconds). Defaults to `0` (off).
   */
  pollingInterval?: number;
  /**
   * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.
   *
   * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
   *
   * Note: requires `setupListeners` to have been called.
   */
  refetchOnReconnect?: boolean;
  /**
   * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.
   *
   * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
   *
   * Note: requires `setupListeners` to have been called.
   */
  refetchOnFocus?: boolean;
};

interface StartQueryActionCreatorOptions {
  subscribe?: boolean;
  forceRefetch?: boolean | number;
  subscriptionOptions?: SubscriptionOptions;
}

interface StartMutationActionCreatorOptions {
  /**
   * If this mutation should be tracked in the store.
   * If you just want to manually trigger this mutation using `dispatch` and don't care about the
   * result, state & potential errors being held in store, you can set this to false.
   * (defaults to `true`)
   */
  track?: boolean;
}
```

#### Description

A Redux thunk action creator that you can dispatch to trigger data fetch queries or mutations.

React Hooks users will most likely never need to use these directly, as the hooks automatically dispatch these actions as needed.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. Also, you have to manually unsubscribe once your component unmounts. To get an idea of what that entails, see the [Svelte Example](../../../examples/svelte) or the [React Class Components Example](../../../examples/react-class-components)
:::

## `select`

#### Signature

```ts
type CreateCacheSelectorFactory = QueryResultSelectorFactory | MutationResultSelectorFactory;

type QueryResultSelectorFactory = (
  queryArg: QueryArg | SkipSelector
) => (state: RootState) => QueryResultSelectorResult<Definition>;

type MutationResultSelectorFactory<Definition extends MutationDefinition<any, any, any, any>, RootState> = (
  requestId: string | SkipSelector
) => (state: RootState) => MutationSubState<Definition> & RequestStatusFlags;

type SkipSelector = typeof Symbol;
```

#### Description

A function that accepts a cache key argument, and generates a new memoized selector for reading cached data for this endpoint using the given cache key. The generated selector is memoized using [Reselect's `createSelector`](https://redux-toolkit.js.org/api/createSelector).

RTKQ defines a `Symbol` named `skipSelector` internally. If `skipSelector` is passed as the query argument to these selectors, the selector will return `undefined`. This can be used to avoid returning a value if a given query is supposed to be disabled.

:::caution

RTKQ does not currently export `skipSelector`, although the React hooks use it internally. We plan to export it before final release so that end users can use that as well - see https://github.com/rtk-incubator/rtk-query/issues/211 .

:::

React Hooks users will most likely never need to use these directly, as the hooks automatically use these selectors as needed.

:::caution

Each call to `.select(someCacheKey)` returns a _new_ selector function instance. In order for memoization to work correctly, you should create a given selector function once per cache key and reuse that selector function instance, rather than creating a new selector instance each time.

:::

## Matchers

A set of [Redux Toolkit action matching utilities](https://redux-toolkit.js.org/api/matching-utilities) that match the `pending`, `fulfilled`, and `rejected` actions that will be dispatched by this thunk. These allow you to match on Redux actions for that endpoint, such as in `createSlice.extraReducers` or a custom middleware. Those are implemented as follows:

```ts
 matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
 matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
 matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
```
