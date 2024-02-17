import type { Linter } from 'eslint'
import globals from 'globals'

export const vitestGlobals = {
  suite: false,
  test: false,
  describe: false,
  it: false,
  expectTypeOf: false,
  assertType: false,
  expect: false,
  assert: false,
  vitest: false,
  vi: false,
  beforeAll: false,
  afterAll: false,
  beforeEach: false,
  afterEach: false,
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
  parserOptions: {
    project: ['./tsconfig.json'],
    ecmaVersion: 'latest',
    projectFolderIgnoreList: ['dist'],
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', '.*'],
  reportUnusedDisableDirectives: true,
  root: true,
  overrides: [
    {
      files: ['**/*.m{t,j}s'],
      parserOptions: {
        project: ['./tsconfig.json'],
        ecmaVersion: 'latest',
        projectFolderIgnoreList: ['dist'],
        sourceType: 'module',
      },
    },
    {
      files: ['**/*.c{t,j}s'],
      parserOptions: {
        project: ['./tsconfig.json'],
        ecmaVersion: 'latest',
        projectFolderIgnoreList: ['dist'],
        sourceType: 'script',
      },
    },
  ],
}

module.exports = reduxESLintLegacyConfig
