import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-expo',
  verbose: true,
  /**
   * `jest-expo`'s own patterns, with the Redux packages added to its
   * allowlist, so an ES module build of any of them gets run through Babel
   * instead of failing with
   * `SyntaxError: Cannot use import statement outside a module`.
   */
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation)|(@reduxjs/toolkit|redux|redux-thunk|reselect|react-redux|immer)/)',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  /**
   * The preset does not transform `.mjs`, so `.mjs` files would skip Babel
   * even when the allowlist above includes them.
   */
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
  /**
   * React Native's `jest` preset includes a
   * [polyfill for `window`](https://github.com/facebook/react-native/blob/acb634bc9662c1103bc7c8ca83cfdc62516d0060/packages/react-native/jest/setup.js#L61-L66).
   * This polyfill causes React-Redux to use `useEffect`
   * instead of `useLayoutEffect` for the `useIsomorphicLayoutEffect` hook.
   * As a result, nested component updates may not be properly batched
   * when using the `connect` API, leading to potential issues.
   */
  globals: {
    window: undefined,
    navigator: {
      product: 'ReactNative',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  fakeTimers: {
    enableGlobally: true,
    advanceTimers: true,
  },
}

export default config
