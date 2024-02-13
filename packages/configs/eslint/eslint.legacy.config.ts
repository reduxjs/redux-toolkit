import type { Linter } from 'eslint'
import globals from 'globals'

export const vitestGlobals = {
  suite: true,
  test: true,
  describe: true,
  it: true,
  expectTypeOf: true,
  assertType: true,
  expect: true,
  assert: true,
  vitest: true,
  vi: true,
  beforeAll: true,
  afterAll: true,
  beforeEach: true,
  afterEach: true,
} satisfies Record<string, boolean>

export const reduxESLintLegacyConfig: Linter.Config = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/stylistic',
    'prettier',
  ],
  env: { browser: true, node: true, es2024: true },
  globals: {
    ...vitestGlobals,
    ...globals.browser,
    ...globals.node,
    ...globals.nodeBuiltin,
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
    '@typescript-eslint/ban-types': [2],
    '@typescript-eslint/no-namespace': [
      2,
      { allowDeclarations: true, allowDefinitionFiles: true },
    ],
    '@typescript-eslint/ban-ts-comment': [0],
    'sort-imports': [
      2,
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      },
    ],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'], ecmaVersion: 'latest' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', '.*'],
  reportUnusedDisableDirectives: true,
  root: true,
}

module.exports = reduxESLintLegacyConfig
