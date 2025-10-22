import type { UserWorkspaceConfig, ViteUserConfig } from './external.js'
import { mergeConfig } from './external.js'
import { vitestConfig, vitestProject } from './shareableConfigs.js'

/**
 * A function that returns {@linkcode vitestConfig}
 * along with optional additional overrides.
 *
 * @param [additionalOverrides] - **Optional** additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode vitestConfig}, incorporating any provided overrides.
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
 * import vitestConfigModule = require('@reduxjs/vitest-config')
 * import createVitestConfig = vitestConfigModule.createVitestConfig
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
  additionalOverrides: ViteUserConfig = {},
): ViteUserConfig =>
  /* @__PURE__ */ mergeConfig(vitestConfig, additionalOverrides)

/**
 * A function that returns {@linkcode vitestProject}
 * along with optional additional overrides.
 *
 * @param [additionalOverrides] - **Optional** additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode vitestProject}, incorporating any provided overrides.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { createVitestProject } from '@reduxjs/vitest-config'
 *
 * export default createVitestProject({
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
 * const { createVitestProject } = require('@reduxjs/vitest-config')
 *
 * module.exports = createVitestProject({
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
 *   (await import('@reduxjs/vitest-config')).createVitestProject({
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
 * import vitestConfigModule = require('@reduxjs/vitest-config')
 * import createVitestProject = vitestConfigModule.createVitestProject
 *
 * export = createVitestProject({
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
export const createVitestProject = (
  additionalOverrides: UserWorkspaceConfig = {},
): UserWorkspaceConfig =>
  /* @__PURE__ */ mergeConfig(vitestProject, additionalOverrides)
