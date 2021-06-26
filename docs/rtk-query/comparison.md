---
id: comparison
title: Comparison with Other Tools
sidebar_label: Comparison with Other Tools
hide_title: true
description: 'RTK Query > Comparison: Compares features and tradeoffs vs other similar tools'
---

&nbsp;

# Comparison with Other Tools

**RTK Query takes inspiration from many other data fetching libraries in the ecosystem**. Much like [the Redux core library was inspired by tools like Flux and Elm](https://redux.js.org/understanding/history-and-design/prior-art), RTK Query builds on API design patterns and feature concepts popularized by libraries like React Query, SWR, Apollo, and Urql. RTK Query has been written from scratch, but tries to use the best concepts from those libraries and other data fetching tools, with an eye towards leveraging the unique strengths and capabilities of Redux.

We think that all of those tools are great! If you're using one of them, you're happy with it, and it solves the problems you are facing in your app, keep using that tool. The information on this page is meant to help show **where there are differences in features, implementation approaches, and API design**. The goal is to help you **make informed decisions and understand tradeoffs**, rather than argue that tool X is better than tool Y.

## When Should You Use RTK Query?

In general, the main reasons to use RTK Query are:

- You already have a Redux app and you want to simplify your existing data fetching logic
- You want to be able to use the Redux DevTools to see the history of changes to your state over time
- You want to be able to integrate the RTK Query behavior with the rest of the Redux ecosystem
- Your app logic needs to work outside of React

### Unique Capabilities

RTK Query has some unique API design aspects and capabilities that are worth considering.

- With React Query and SWR, you usually define your hooks yourself, and you can do that all over the place and on the fly. With RTK Query, you do so in one central place by defining an "API slice" with multiple endpoints ahead of time. This allows for a more tightly integrated model of mutations automatically invalidating/refetching queries on trigger.
- Because RTK Query dispatches normal Redux actions as requests are processed, all actions are visible in the Redux DevTools. Additionally, every request is automatically is visible to your Redux reducers and can easily update the global application state if necessary ([see example](https://github.com/reduxjs/redux-toolkit/issues/958#issuecomment-809570419)). You can use the endpoint [matcher functionality](./api/created-api/endpoints#matchers) to do additional processing of cache-related actions in your own reducers.
- Like Redux itself, the main RTK Query functionality is UI-agnostic and can be used with any UI layer
- You can easily invalidate entities or patch existing query data (via `util.updateQueryData`) from middleware.
- RTK Query enables [streaming cache updates](./usage/streaming-updates.mdx), such as updating the initial fetched data as messages are received over a websocket, and has built in support for [optimistic updates](./usage/optimistic-updates.mdx) as well.
- RTK Query ships a very tiny and flexible fetch wrapper: [`fetchBaseQuery`](./api/fetchBaseQuery.mdx). It's also very easy to [swap our client with your own](./usage/customizing-queries.mdx), such as using `axios`, `redaxios`, or something custom.
- RTK Query has [a (currently experimental) code-gen tool](https://github.com/rtk-incubator/rtk-query-codegen) that will take an OpenAPI spec or GraphQL schema and give you a typed API client, as well as provide methods for enhancing the generated client after the fact.

## Tradeoffs

### No Normalized or Deduplicated Cache

RTK Query deliberately **does _not_ implement a cache that would deduplicate identical items across multiple requests**. There are several reasons for this:

- A fully normalized shared-across-queries cache is a _hard_ problem to solve
- We don't have the time, resources, or interest in trying to solve that right now
- In many cases, simply refetching data when it's invalidated works well and is easier to understand
- At a minimum, RTKQ can help solve the general use case of "fetch some data", which is a big pain point for a lot of people

### Bundle Size

RTK Query adds a fixed one-time amount to your app's bundle size. Since RTK Query builds on top of Redux Toolkit and React-Redux, the added size varies depending on whether you are already using those in your app. The estimated min+gzip bundle sizes are:

- If you are using RTK already: ~9kb for RTK Query and ~2kb for the hooks.
- If you are not using RTK already:
  - Without React: 17 kB for RTK+dependencies+RTK Query
  - With React: 19kB + React-Redux, which is a peer dependency

Adding additional endpoint definitions should only increase size based on the actual code inside the `endpoints` definitions, which will typically be just a few bytes.

The functionality included in RTK Query quickly pays for the added bundle size, and the elimination of hand-written data fetching logic should be a net improvement in size for most meaningful applications.

## Comparing Feature Sets

It's worth comparing the feature sets of all these tools to get a sense of their similarities and differences.

:::info

This comparison table strives to be as accurate and as unbiased as possible. If you use any of these libraries and feel the information could be improved, feel free to suggest changes (with notes or evidence of claims) by [opening an issue](https://github.com/reduxjs/redux-toolkit/issues/new).

:::

| Feature                                | rtk-query                               | react-query              | apollo                                                                              | urql                                                                                                        |
| -------------------------------------- | --------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Supported Protocols**                | any, REST included                      | any, none included       | GraphQL                                                                             | GraphQL                                                                                                     |
| **API Definition**                     | declarative                             | on use, declarative      | GraphQL schema                                                                      | GraphQL schema                                                                                              |
| **Cache by**                           | endpoint + serialized arguments         | user-defined query-key   | type/id                                                                             | type/id?                                                                                                    |
| **Invalidation Strategy + Refetching** | declarative, by type and/or type/id     | manual by cache key      | automatic cache updates on per-entity level, manual query invalidation by cache key | declarative, by type OR automatic cache updates on per-entity level, manual query invalidation by cache key |
| **Polling **                           | yes                                     | yes                      | yes                                                                                 | yes                                                                                                         |
| **Parallel queries **                  | yes                                     | yes                      | yes                                                                                 | yes                                                                                                         |
| **Dependent queries**                  | yes                                     | yes                      | yes                                                                                 | yes                                                                                                         |
| **Skip queries**                       | yes                                     | yes                      | yes                                                                                 | yes                                                                                                         |
| **Lagged queries**                     | yes                                     | yes                      | no                                                                                  | ?                                                                                                           |
| **Auto garbage collection**            | yes                                     | yes                      | no                                                                                  | ?                                                                                                           |
| **Normalized caching**                 | no                                      | no                       | yes                                                                                 | yes                                                                                                         |
| **Infinite scrolling**                 | TODO                                    | yes                      | requires manual code                                                                | ?                                                                                                           |
| **Prefetching**                        | yes                                     | yes                      | yes                                                                                 | yes?                                                                                                        |
| **Retrying**                           | yes                                     | yes                      | requires manual code                                                                | ?                                                                                                           |
| **Optimistic updates**                 | can update cache by hand                | can update cache by hand | `optimisticResponse`                                                                | ?                                                                                                           |
| **Manual cache manipulation**          | yes                                     | yes                      | yes                                                                                 | yes                                                                                                         |
| **Platforms**                          | hooks for React, everywhere Redux works | hooks for React          | various                                                                             | various                                                                                                     |

## Further Information

- The [React Query "Comparison" page](https://react-query.tanstack.com/comparison) has an additional detailed feature set comparison table and discussion of capabilities
- Urql maintainer Phil Pluckthun wrote [an excellent explanation of what a "normalized cache" is and how Urql's cache works](https://kitten.sh/graphql-normalized-caching)
- The [RTK Query "Cache Behavior" page](./usage/cache-behavior.mdx#tradeoffs) has further details on why RTK Query does not implement a normalized cache
