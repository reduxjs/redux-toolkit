import type { TSESLint } from '@typescript-eslint/utils'
import type { Linter } from 'eslint'
import { packageJsonName } from './packageJsonName.js'

/**
 * An object representing
 * {@link https://eslint.org/docs/latest/use/configure/ignore#ignoring-files | **global ignore patterns**}
 * for ESLint configuration.
 *
 * @since 0.0.1
 * @public
 */
export const globalIgnores = {
  name: `${packageJsonName}/global-ignores`,
  ignores: [
    '**/__snapshots__/',
    '**/.docusaurus/',
    '**/.expo/',
    '**/.next/',
    '**/.playwright/',
    '**/.temp/',
    '**/.tmp/',
    '**/.turbo/',
    '**/.wrangler/',
    '**/.yalc/',
    '**/.yarn/',
    '**/*.snap',
    '**/build/',
    '**/coverage/',
    '**/dist/',
    '**/temp/',
  ],
} as const satisfies TSESLint.FlatConfig.Config satisfies Linter.Config
