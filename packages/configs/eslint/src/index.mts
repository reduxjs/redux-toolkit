import js from '@eslint/js'
import type { TSESLint } from '@typescript-eslint/utils'
import prettierConfig from 'eslint-config-prettier'
import type { ConfigWithExtends } from 'typescript-eslint'
import { config, configs, parser } from 'typescript-eslint'

/**
 * Represents the global variables provided by Vitest.
 *
 * @since 0.0.1
 * @public
 */
export type VitestGlobals = {
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
 *
 * @since 0.0.1
 * @public
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
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `eslint.config.mts` or `eslint.config.mjs`__</caption>
 *
 * ```ts
 * import { reduxESLintConfig } from '@reduxjs/eslint-config'
 *
 * export default reduxESLintConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { reduxESLintConfig } = require('@reduxjs/eslint-config')
 *
 * module.exports = reduxESLintConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cjs` or `eslint.config.cts` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/eslint-config')).reduxESLintConfig)()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import ReduxESLintConfig = require('@reduxjs/eslint-config')
 * import reduxESLintConfig = ReduxESLintConfig.reduxESLintConfig
 *
 * export = reduxESLintConfig
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const reduxESLintConfig: TSESLint.FlatConfig.Config[] =
  /* @__PURE__ */ config(
    // `ignores` must be first.
    // config with just `ignores` is the replacement for `.eslintignore`
    {
      name: '@reduxjs/global-ignores',
      ignores: ['**/dist/', '**/.yalc/', '**/build/', '**/lib/', '**/temp/'],
    },
    { name: '@reduxjs/javascript', ...js.configs.recommended },
    ...configs.recommended,
    ...configs.stylistic,
    { name: '@reduxjs/prettier-config', ...prettierConfig },
    {
      name: '@reduxjs/main',
      languageOptions: {
        globals: {
          ...vitestGlobals,
        },
        parser,
        parserOptions: {
          projectService: {
            allowDefaultProject: ['.size-limit.cjs'],
            defaultProject: './tsconfig.json',
          },
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
        '@typescript-eslint/no-explicit-any': [0],
        '@typescript-eslint/no-empty-object-type': [
          2,
          { allowInterfaces: 'with-single-extends' },
        ],
        '@typescript-eslint/no-restricted-types': [
          2,
          {
            types: {
              '{}': {
                suggest: ['AnyNonNullishValue', 'EmptyObject', 'AnyObject'],
              },
            },
          },
        ],
        '@typescript-eslint/no-namespace': [
          2,
          { allowDeclarations: true, allowDefinitionFiles: true },
        ],
        '@typescript-eslint/ban-ts-comment': [0],
        '@typescript-eslint/consistent-type-definitions': [0, 'type'],
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
      linterOptions: { reportUnusedDisableDirectives: 2 },
    },
    {
      name: '@reduxjs/commonjs',
      files: ['**/*.c[jt]s'],
      languageOptions: { sourceType: 'commonjs' },
      rules: {
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
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `eslint.config.mts` or `eslint.config.mjs`__</caption>
 *
 * ```ts
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
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { createESLintConfig } = require('@reduxjs/eslint-config')
 *
 * module.exports = createESLintConfig([
 *   {
 *     rules: {
 *       'no-console': [0],
 *     },
 *   },
 *   {
 *     // ...Other additional overrides
 *   },
 * ])
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
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
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import ReduxESLintConfig = require('@reduxjs/eslint-config')
 * import createESLintConfig = ReduxESLintConfig.createESLintConfig
 *
 * export = createESLintConfig([
 *   {
 *     rules: {
 *       'no-console': [0],
 *     },
 *   },
 *   {
 *     // ...Other additional overrides
 *   },
 * ])
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const createESLintConfig = (
  additionalOverrides: ConfigWithExtends[] = [],
): TSESLint.FlatConfig.ConfigFile =>
  /* @__PURE__ */ config(...reduxESLintConfig, ...additionalOverrides)
