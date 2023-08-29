# Publish CI

Isolated projects for testing against packaged artifacts.

## Getting Started Locally

Before building or testing the individual projects, you must first build and package Redux Toolkit.

1. Install dependencies

```sh
yarn install
```

2. Build Redux Toolkit

```sh
yarn workspace @reduxjs/toolkit build
```

3. Package Redux Toolkit

```sh
yarn workspace @reduxjs/toolkit pack
```

## Building and Testing

Follow the steps below for each project you want to build and test.

1. Navigate to the root of the project

```sh
cd examples/publish-ci/<project name>
```

2. Install the project's dependencies

```sh
yarn install
```

3. Run the build and/or test scripts

```sh
yarn build && yarn test
```