import js from '@eslint/js'
import type { TSESLint } from '@typescript-eslint/utils'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import type { ConfigWithExtends } from 'typescript-eslint'
import { config, configs, parser, plugin } from 'typescript-eslint'

const { browser, node, nodeBuiltin } = globals

/**
 * Represents the global variables provided by Vitest.
 */
interface VitestGlobals {
  suite: false
  test: false
  describe: false
  it: false
  expectTypeOf: false
  assertType: false
  expect: false
  assert: false
  vitest: false
  vi: false
  beforeAll: false
  afterAll: false
  beforeEach: false
  afterEach: false
  onTestFailed: false
  onTestFinished: false
}

/**
 * An object representing the globals provided by Vitest for use in testing.
 */
export const vitestGlobals: VitestGlobals = {
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
  onTestFailed: false,
  onTestFinished: false,
} satisfies Record<string, boolean>

/**
 * ESLint configuration tailored for internal Redux projects using TypeScript.
 *
 * @example
 * <caption>__ECMAScript Modules (ESM) usage inside a file like `eslint.config.mjs`__</caption>
 *
 * ```js
 * import { reduxESLintConfig } from '@reduxjs/eslint-config'
 *
 * export default reduxESLintConfig
 * ```
 *
 * @example
 * <caption>__CommonJS (CJS) usage inside a file like `eslint.config.cjs`__</caption>
 *
 * ```js
 * module.exports = (async () =>
 *   (await import('@reduxjs/eslint-config')).reduxESLintConfig)()
 * ```
 */
export const reduxESLintConfig: TSESLint.FlatConfig.Config[] = config(
  // `ignores` must be first.
  // config with just `ignores` is the replacement for `.eslintignore`
  { ignores: ['**/dist/', '.*/'] },
  js.configs.recommended,
  ...configs.recommended,
  ...configs.stylistic,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...vitestGlobals,
        ...nodeBuiltin,
        ...browser,
        ...node,
      },
      parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        ecmaVersion: 'latest',
      },
    },
    rules: {
      'no-undef': [0],
      '@typescript-eslint/consistent-type-imports': [
        2,
        { fixStyle: 'separate-type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/consistent-type-exports': [2],
      '@typescript-eslint/no-unused-vars': [0],
      '@typescript-eslint/array-type': [2, { default: 'array-simple' }],
      '@typescript-eslint/no-explicit-any': [0],
      '@typescript-eslint/no-empty-interface': [
        2,
        { allowSingleExtends: true },
      ],
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
    plugins: { '@typescript-eslint': plugin },
    linterOptions: { reportUnusedDisableDirectives: 2 },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-var-requires': [0],
      '@typescript-eslint/no-require-imports': [0],
    },
  },
)

/**
 * A function that returns {@linkcode reduxESLintConfig}
 * along with optional additional overrides.
 * It's made mainly to provide intellisense and eliminate
 * the need for manual type annotations using JSDoc comments.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode reduxESLintConfig}, incorporating any provided overrides.
 *
 * @example
 * <caption>__ECMAScript Modules (ESM) usage inside a file like `eslint.config.mjs`__</caption>
 * ```js
 * import { createESLintConfig } from '@reduxjs/eslint-config'
 *
 * export default createESLintConfig([
 *   {
 *     rules: {
 *       'no-console': [0],
 *     },
 *   },
 *   {
 *     // ...Other additional overrides
 *   },
 * ])
 *
 * ```
 *
 * @example
 * <caption>__CommonJS (CJS) usage inside a file like `eslint.config.cjs`__</caption>
 * ```js
 * module.exports = (async () =>
 *   (await import('@reduxjs/eslint-config')).createESLintConfig([
 *     {
 *       rules: {
 *         'no-console': [0],
 *       },
 *     },
 *     {
 *       // ...Other additional overrides
 *     },
 *   ]))()
 * ```
 */
export const createESLintConfig = (
  additionalOverrides: ConfigWithExtends[] = [],
): TSESLint.FlatConfig.Config[] => reduxESLintConfig.concat(additionalOverrides)

export default reduxESLintConfig
