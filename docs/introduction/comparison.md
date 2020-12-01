---
id: comparison
title: Comparison
sidebar_label: Comparison
hide_title: true
hide_table_of_contents: true
---

# Comparison

RTK Query takes inspiration from many other data fetching libraries in the ecosystem. Much like [the Redux core library was inspired by tools like Flux and Elm](https://redux.js.org/understanding/history-and-design/prior-art), RTK Query builds on API design patterns and feature concepts popularized by libraries like React Query, SWR, Apollo, and Urql. RTK Query has been written from scratch, but tries to use the best concepts from those libraries and other data fetching tools, with an eye towards leveraging the unique strengths and capabilities of Redux.

It's worth comparing the feature sets of all these tools to get a sense of their similarities and differences.

:::info

This comparison table strives to be as accurate and as unbiased as possible. If you use any of these libraries and feel the information could be improved, feel free to suggest changes (with notes or evidence of claims) by [opening an issue](https://github.com/rtk-incubator/rtk-query/issues/new).

:::

| Feature                                | rtk-query                               | react-query              | apollo                                                                              | urql                                                                                                        |
| -------------------------------------- | --------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Supported Protocols**                | any, REST included                      | any, none included       | GraphQL                                                                             | GraphQL                                                                                                     |
| **API Definition**                     | declarative                             | on use                   | GraphQL schema                                                                      | GraphQL schema                                                                                              |
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
