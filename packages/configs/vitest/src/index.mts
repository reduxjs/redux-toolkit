import { existsSync } from 'node:fs'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { UserConfig } from 'vitest/config'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * Vitest configuration tailored for internal Redux projects using TypeScript.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { reduxVitestConfig } from '@reduxjs/vitest-config'
 *
 * export default reduxVitestConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { reduxVitestConfig } = require('@reduxjs/vitest-config')
 *
 * module.exports = reduxVitestConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).reduxVitestConfig)()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import ReduxVitestConfig = require('@reduxjs/vitest-config')
 * import reduxVitestConfig = ReduxVitestConfig.reduxVitestConfig
 *
 * export = reduxVitestConfig
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const reduxVitestConfig: UserConfig = /* @__PURE__ */ defineConfig({
  plugins: [/* @__PURE__ */ tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    setupFiles: /* @__PURE__ */ existsSync('./vitest.setup.ts')
      ? ['./vitest.setup.ts']
      : [],
  },
  define: { 'import.meta.vitest': 'undefined' },
})

/**
 * A function that returns {@linkcode reduxVitestConfig}
 * along with optional additional overrides.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode reduxVitestConfig}, incorporating any provided overrides.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { createVitestConfig } from '@reduxjs/vitest-config'
 *
 * export default createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { createVitestConfig } = require('@reduxjs/vitest-config')
 *
 * module.exports = createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).createVitestConfig({
 *     test: {
 *       environment: 'jsdom',
 *       // Other additional overrides
 *     },
 *   }))()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import ReduxVitestConfig = require('@reduxjs/vitest-config')
 * import createVitestConfig = ReduxVitestConfig.createVitestConfig
 *
 * export = createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const createVitestConfig = (
  additionalOverrides: UserConfig = {},
): UserConfig =>
  /* @__PURE__ */ mergeConfig(reduxVitestConfig, additionalOverrides)
