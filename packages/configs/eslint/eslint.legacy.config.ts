import type { Linter } from 'eslint'
import globals from 'globals'

/**
 * An object representing the globals provided by Vitest for use in testing.
 */
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

/**
 * ESLint configuration tailored for internal Redux projects using TypeScript.
 */
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

/**
 * A function that returns {@linkcode reduxESLintLegacyConfig}
 * along with optional additional overrides.
 * It's made mainly to provide intellisense and eliminate
 * the need for manual type annotations using JSDoc comments.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default `reduxESLintLegacyConfig`, incorporating any provided overrides.
 */
export const createLegacyESLintConfig = (
  additionalOverrides: Partial<Linter.Config> = {},
): Linter.Config => ({
  ...reduxESLintLegacyConfig,
  ...additionalOverrides,
})

export default reduxESLintLegacyConfig
