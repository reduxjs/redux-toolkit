import type { Config } from 'prettier'

/**
 * Prettier configuration tailored for internal Redux projects.
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
 * @returns An augmented version of the default `reduxPrettierConfig`, incorporating any provided overrides.
 */
export const createPrettierConfig = (
  additionalOverrides: Partial<Config> = {},
): Config => ({
  ...reduxPrettierConfig,
  ...additionalOverrides,
})

export default reduxPrettierConfig
