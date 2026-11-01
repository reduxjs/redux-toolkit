import type { Config } from 'jest'

const config: Config = {
  preset: 'react-native',
  verbose: true,
  /**
   * The preset's own allowlist (`react-native` and `@react-native/*`) plus the
   * Redux packages, so an ES module build of any of them gets run through
   * Babel instead of failing with
   * `SyntaxError: Cannot use import statement outside a module`.
   */
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@reduxjs/toolkit|redux|redux-thunk|reselect|react-redux|immer)/)',
  ],
  /**
   * The preset only transforms `.js`, `.ts` and `.tsx`, so `.mjs` files
   * would skip Babel even when the allowlist above includes them.
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
