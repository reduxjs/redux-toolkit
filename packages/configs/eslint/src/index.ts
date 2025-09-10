export { config, configs, parser, plugin } from 'typescript-eslint'
export type {
  Config,
  ConfigArray,
  ConfigWithExtends,
  InfiniteDepthConfigWithExtends,
} from 'typescript-eslint'
export { disabledRules } from './disabledRules.js'
export { globalIgnores } from './globalIgnores.js'
export { globals, vitestGlobals } from './globals.js'
export { flatESLintConfig } from './shareableConfigs.js'
export { createESLintConfig } from './utils.js'
