import { createESLintConfig } from '@reduxjs/eslint-config'

export default createESLintConfig([
  { ignores: ['**/__testfixtures__/'] },
  { rules: { '@typescript-eslint/array-type': [0] } }
])
