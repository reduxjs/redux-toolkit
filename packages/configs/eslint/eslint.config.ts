import type { Linter } from 'eslint'

const eslintConfig: Linter.Config = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/stylistic',
    'prettier',
  ],
  env: { jest: true, browser: true, node: true, es2024: true },
  globals: {
    suite: true,
    expectTypeOf: true,
    assertType: true,
    assert: true,
    vitest: true,
    vi: true,
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      2,
      { fixStyle: 'separate-type-imports' },
    ],
    'no-redeclare': [0],
    '@typescript-eslint/no-redeclare': [2],
    '@typescript-eslint/no-unused-vars': [0],
    '@typescript-eslint/array-type': [2, { default: 'array-simple' }],
    '@typescript-eslint/no-explicit-any': [0],
    '@typescript-eslint/no-empty-interface': [2, { allowSingleExtends: true }],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true, ecmaVersion: 'latest' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist'],
  root: true,
  overrides: [
    { files: ['*.{c,m,}{t,j}s', '*.{t,j}sx'] },
    { files: ['*{test,spec}.{t,j}s?(x)'] },
  ],
}

module.exports = eslintConfig
