# Contributing

We are open to, and grateful for, any contributions made by the community. By contributing to Redux Toolkit, you agree to abide by the [code of conduct](https://github.com/reduxjs/redux-toolkit/blob/master/CODE_OF_CONDUCT.md).

## Reporting Issues and Asking Questions

Before opening an issue, please search the [issue tracker](https://github.com/reduxjs/redux-toolkit/issues) to make sure your issue hasn't already been reported.

Please ask any general and implementation specific questions on [Stack Overflow with a Redux Toolkit tag](http://stackoverflow.com/questions/tagged/redux-toolkit?sort=votes&pageSize=50) for support.

## Development

Visit the [Issue tracker](https://github.com/reduxjs/redux-toolkit/issues) to find a list of open issues that need attention.

Fork, then clone the repo:

```
git clone https://github.com/your-username/redux-toolkit.git
```

Then run `yarn` from the parent directory.

### Building

Running the `build` task will create both a CommonJS module-per-module build and a UMD build.

```
npm run build
```

### Testing and Linting

To run the tests:

```
yarn test
```

To continuously watch and run tests, run the following:

```
yarn test --watch
```

### New Features

Please open an issue with a proposal for a new feature or refactoring before starting on the work. We don't want you to waste your efforts on a pull request that we won't want to accept.

## Submitting Changes

- Open a new issue in the [Issue tracker](https://github.com/reduxjs/redux-toolkit/issues).
- Fork the repo.
- Create a new feature branch based off the `master` branch.
- Make sure all tests pass and there are no linting errors.
- Submit a pull request, referencing any issues it addresses.
- If you changed external-facing types, make sure to also build the project locally and include the updated API report file etc/redux-toolkit.api.md in your pull request.

Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, we'll try to get back to you as soon as possible. We may suggest some changes or improvements.

Thank you for contributing!
