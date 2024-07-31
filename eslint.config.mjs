/**
 * @import { Linter } from 'eslint'
 */

import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'

/**
 * @satisfies {Linter.Config[]}
 */
const ESLintConfig = [
  { name: 'ignores', ignores: ['**/'] },
  { name: 'javascript', ...js.configs.recommended },
  { name: 'prettier-config', ...prettierConfig },
]

export default ESLintConfig
