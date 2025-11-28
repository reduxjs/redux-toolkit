import type { Config } from 'prettier'

/**
 * Prettier configuration.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`__</caption>
 *
 * ```js
 * import { prettierConfig } from '@reduxjs/prettier-config'
 *
 * export default prettierConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using `require`)__</caption>
 *
 * ```js
 * const { prettierConfig } = require('@reduxjs/prettier-config')
 *
 * module.exports = prettierConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using dynamic import)__</caption>
 *
 * ```js
 * module.exports = (async () =>
 *   (await import('@reduxjs/prettier-config')).prettierConfig)()
 * ```
 *
 * @public
 * @since 0.0.1
 */
export const prettierConfig = {
  semi: false,
  singleQuote: true,
} as const satisfies Config
