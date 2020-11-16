---
id: examples-overview
title: Examples Overview
sidebar_label: Examples Overview
hide_title: true
---

# `About the examples`

Currently, there are [several examples](https://github.com/rtk-incubator/rtk-query/tree/main/examples) that exist in the repo that you're able to run locally. These are not meant to be what you base your application on, but exist to show _very specific_ behaviors that you may not actually want or need in your application. For most users, the basic examples in the [Queries](../concepts/queries) and [Mutations](../concepts/mutations) sections will cover the majority of your needs.

As a part of the CI setup, the examples are automatically built and deployed via the magic and goodwill of CodeSandbox CI. If you're interested, you can always [see the latest builds for every PR](https://ci.codesandbox.io/status/rtk-incubator/rtk-query) at any time.

Please note that when playing with the examples in CodeSandbox that you can experience quirky behavior, especially if you fork them and start editing files. Hot reloading, CSB service workers and [`msw`](https://mswjs.io/) sometimes have trouble getting on the right page -- when that happens, just refresh in the CSB browser pane.

### Running the examples

Clone the repo, and in the root directory run:

```sh
yarn
```

This will build the library, build the examples, and properly link the dependencies. If you want to run tests, you can run `yarn test` in the root to see the core tests, and by going into the examples folders and running `yarn test` for each example.

:::info Windows Users
If you do choose to run the examples locally and you're a Windows user, make sure to use `wsl2` when you clone the repo, or run them in docker.
:::
