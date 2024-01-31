import type { Linter } from 'eslint'

const eslintConfig: Linter.Config = {
  extends: ['eslint:recommended', 'prettier'],
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
    'no-unused-vars': [0, { argsIgnorePattern: '^_', args: 'none' }],
    'no-redeclare': [0],
    '@typescript-eslint/no-redeclare': [2],
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
