import type { Linter } from 'eslint'

const eslintConfig: Linter.Config = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/stylistic',
    // 'plugin:@typescript-eslint/recommended-type-checked',
    // 'plugin:@typescript-eslint/stylistic-type-checked',
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
      { fixStyle: 'separate-type-imports', disallowTypeAnnotations: false },
    ],
    '@typescript-eslint/consistent-type-exports': [2],
    '@typescript-eslint/no-unused-vars': [0],
    '@typescript-eslint/array-type': [2, { default: 'array-simple' }],
    '@typescript-eslint/no-explicit-any': [0],
    '@typescript-eslint/no-empty-interface': [2, { allowSingleExtends: true }],
    '@typescript-eslint/no-unsafe-argument': [0],
    '@typescript-eslint/ban-types': [
      2,
      // {
      //   extendDefaults: true,
      //   types: {
      //     '{}': { fixWith: 'AnyNonNullishValue' },
      //     Function: { fixWith: 'AnyFunction' },
      //   },
      // },
    ],
    // '@typescript-eslint/prefer-as-const': [2],
    // '@typescript-eslint/no-unnecessary-type-constraint': [2],
    // '@typescript-eslint/no-var-requires': [2],
    // 'no-unsafe-optional-chaining': [2],
    // '@typescript-eslint/no-unsafe-return': [0],
    // '@typescript-eslint/no-unsafe-assignment': [0],
    // '@typescript-eslint/no-empty-function': [0],
    '@typescript-eslint/no-namespace': [
      2,
      { allowDeclarations: true, allowDefinitionFiles: true },
    ],
    '@typescript-eslint/ban-ts-comment': [0],
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
