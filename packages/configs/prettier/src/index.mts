import type { Config } from 'prettier'

/**
 * Prettier configuration tailored for internal Redux projects.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`__</caption>
 *
 * ```js
 * import { reduxPrettierConfig } from '@reduxjs/prettier-config'
 *
 * export default reduxPrettierConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using `require`)__</caption>
 *
 * ```js
 * const { reduxPrettierConfig } = require('@reduxjs/prettier-config')
 *
 * module.exports = reduxPrettierConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using dynamic import)__</caption>
 *
 * ```js
 * module.exports = (async () =>
 *   (await import('@reduxjs/prettier-config')).reduxPrettierConfig)()
 * ```
 *
 * @public
 * @since 0.0.1
 */
export const reduxPrettierConfig: Config = {
  semi: false,
  singleQuote: true,
}

/**
 * A function that returns {@linkcode reduxPrettierConfig}
 * along with optional additional overrides.
 * It's made mainly to provide intellisense and eliminate
 * the need for manual type annotations using JSDoc comments.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode reduxPrettierConfig}, incorporating any provided overrides.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`__</caption>
 *
 * ``js
 * import { createPrettierConfig } from '@reduxjs/prettier-config'
 *
 * export default createPrettierConfig({
 *   arrowParens: 'avoid',
 *   // ...Other additional overrides
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using `require`)__</caption>
 *
 * ```js
 * const { createPrettierConfig } = require('@reduxjs/prettier-config')
 *
 * module.exports = createPrettierConfig({
 *   arrowParens: 'avoid',
 *   // ...Other additional overrides
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using dynamic import)__</caption>
 *
 * ```js
 * module.exports = (async () =>
 *   (await import('@reduxjs/prettier-config')).createPrettierConfig({
 *     arrowParens: 'avoid',
 *     // ...Other additional overrides
 *   }))()
 * ```
 *
 * @public
 * @since 0.0.1
 */
export const createPrettierConfig = (
  additionalOverrides: Config = {},
): Config => ({ ...reduxPrettierConfig, ...additionalOverrides })