import type { Config } from 'prettier'

export const reduxPrettierConfig: Config = {
  semi: false,
  singleQuote: true,
}

export const createPrettierConfig = (
  overrides: Partial<Config> = {},
): Config => ({
  ...reduxPrettierConfig,
  ...overrides,
})

export default reduxPrettierConfig
