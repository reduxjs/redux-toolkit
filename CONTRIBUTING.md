# Contributing

We are open to, and grateful for, any contributions made by the community. By contributing to Redux Toolkit, you agree to abide by the [code of conduct](https://github.com/reduxjs/redux-toolkit/blob/master/CODE_OF_CONDUCT.md).

## Reporting Issues and Asking Questions

Before opening an issue, please search the [issue tracker](https://github.com/reduxjs/redux-toolkit/issues) to make sure your issue hasn't already been reported.

Please ask any general and implementation specific questions on [Stack Overflow with a Redux Toolkit tag](http://stackoverflow.com/questions/tagged/redux-toolkit?sort=votes&pageSize=50) for support.

We ask you to do this because StackOverflow has a much better job at keeping popular questions visible. Unfortunately good answers get lost and outdated on GitHub.

If your question gets closed or you don't get a reply after a few days, consider opening a [discussion](https://github.com/reduxjs/redux-toolkit/discussions) or joining the [Reactiflux](https://discord.gg/reactiflux) discord server and asking in the #redux channel.

### Help Us Help You

On both websites, it is a good idea to structure your code and question in a way that is easy to read to help people to answer it. For example, we encourage you to use syntax highlighting, indentation, and split text in paragraphs.

Please keep in mind that people spend their free time trying to help you. You can make it easier for them if you provide versions of the relevant libraries and a runnable small project reproducing your issue. You can put your code on [JSBin](https://jsbin.com) or, for bigger projects, on GitHub. Make sure all the necessary dependencies are declared in `package.json` so anyone can run `npm install && npm start` and reproduce your issue.

## Getting started

Visit the [Issue tracker](https://github.com/reduxjs/redux-toolkit/issues) to find a list of open issues that need attention.

### Bugs and Improvements

We use the [Issue tracker](https://github.com/reduxjs/redux-toolkit/issues) to keep track of bugs and improvements to Redux Toolkit itself, its examples, and the documentation. We encourage you to open issues to discuss improvements, architecture, theory, internal implementation, etc. If a topic has been discussed before, we will ask you to join the previous discussion.

### New Features

Please open an [issue](https://github.com/reduxjs/redux-toolkit/issues) with a proposal for a new feature or refactoring before starting on the work. We don't want you to waste your efforts on a pull request that we won't want to accept.

### Fork the repository

Please use the GitHub UI to [fork this repository](https://github.com/reduxjs/redux-toolkit) (_read more about [Forking a repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo)_). Redux Toolkit has forked builds enabled in the CI, so you will see the build status of your fork's branch.

![Fork Button](https://docs.github.com/assets/cb-40742/mw-1440/images/help/repository/fork-button.webp)

Fork, then clone the repo:

```sh
git clone https://github.com/your-username/redux-toolkit.git
```

### Install

```bash
$ cd redux-toolkit
$ yarn
```

### Build

You can build the packages with the following command:

```
yarn build
```

### Tests

You can run tests for all packages with:

```
yarn test
```

To continuously watch and run tests, run the following:

```
yarn test --watch
```

## Git workflow / Submitting Changes

- Open a new issue in the [Issue tracker](https://github.com/reduxjs/redux-toolkit/issues).
- Fork the repo.
- Create a new feature branch based off the `master` branch.
- Make sure all tests pass and there are no linting errors.
- Submit a pull request, referencing any issues it addresses.
- If you changed external-facing types, make sure to also build the project locally and include the updated API report file etc/redux-toolkit.api.md in your pull request.

Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, we'll try to get back to you as soon as possible. We may suggest some changes or improvements.

Thank you for contributing!
