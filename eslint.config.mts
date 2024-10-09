import { createESLintConfig } from '@reduxjs/eslint-config'
import { configs } from 'typescript-eslint'

export default createESLintConfig([
  { name: 'root-workspace/global-ignores', ignores: ['**/'] },
  configs.disableTypeChecked,
])
