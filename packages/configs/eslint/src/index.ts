import js from '@eslint/js'
import type { TSESLint } from '@typescript-eslint/utils'
import type { Linter } from 'eslint'
import prettierConfig from 'eslint-config-prettier/flat'
import type { ConfigWithExtends } from 'typescript-eslint'
import { config, configs, parser } from 'typescript-eslint'

/**
 * This is used because if we import the package name from the
 * `package.json` file, it will be bundled into the final output,
 * which is not desired.
 *
 * @since 0.0.1
 * @internal
 */
const packageName = '@reduxjs/eslint-config'

/**
 * Represents the global variables provided by Vitest.
 *
 * @since 0.0.1
 * @public
 */
export type VitestGlobals = {
  suite: 'writable'
  test: 'writable'
  chai: 'writable'
  describe: 'writable'
  it: 'writable'
  expectTypeOf: 'writable'
  assertType: 'writable'
  expect: 'writable'
  assert: 'writable'
  vitest: 'writable'
  vi: 'writable'
  beforeAll: 'writable'
  afterAll: 'writable'
  beforeEach: 'writable'
  afterEach: 'writable'
  onTestFailed: 'writable'
  onTestFinished: 'writable'
}

/**
 * An object representing the
 * {@link https://vitest.dev/config/#globals | globals} provided by
 * {@link https://vitest.dev | **Vitest**} for use in testing.
 *
 * @since 0.0.1
 * @public
 */
export const vitestGlobals: VitestGlobals = {
  suite: 'writable',
  test: 'writable',
  chai: 'writable',
  describe: 'writable',
  it: 'writable',
  expectTypeOf: 'writable',
  assertType: 'writable',
  expect: 'writable',
  assert: 'writable',
  vitest: 'writable',
  vi: 'writable',
  beforeAll: 'writable',
  afterAll: 'writable',
  beforeEach: 'writable',
  afterEach: 'writable',
  onTestFailed: 'writable',
  onTestFinished: 'writable',
} satisfies Record<string, 'writable'>

/**
 * An object comprised of ESLint rules to disable.
 * These rules are disabled in {@linkcode reduxESLintConfig}.
 *
 * @since 0.0.1
 * @public
 */
export const disabledRules: Linter.RulesRecord = {
  'no-undef': [0, { typeof: false }],
  '@typescript-eslint/no-unused-vars': [
    0,
    {
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/ban-ts-comment': [
    0,
    {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    },
  ],
  '@typescript-eslint/no-explicit-any': [
    0,
    {
      fixToUnknown: false,
      ignoreRestArgs: false,
    },
  ],
} as const satisfies Linter.RulesRecord

/**
 * An object representing
 * {@link https://eslint.org/docs/latest/use/configure/ignore#ignoring-files | **global ignore patterns**}
 * for ESLint configuration.
 *
 * @since 0.0.1
 * @public
 */
export const globalIgnores: Linter.Config = {
  name: `${packageName}/global-ignores`,
  ignores: [
    '**/dist/',
    '**/build/',
    '**/lib/',
    '**/coverage/',
    '**/__snapshots__/',
    '**/temp/',
    '**/.temp/',
    '**/.tmp/',
    '**/.yalc/',
    '**/.yarn/',
    '**/.docusaurus/',
    '**/.next/',
  ],
} as const satisfies Linter.Config

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
    globalIgnores,

    {
      name: `${js.meta.name}/recommended`,
      ...js.configs.recommended,
    },

    configs.recommended,
    configs.stylistic,

    {
      name: `${packageName}/main`,
      languageOptions: {
        globals: {
          ...vitestGlobals,
        },
        parser,
        parserOptions: {
          projectService: true,
          ecmaVersion: 'latest',
        },
      },

      rules: {
        '@typescript-eslint/consistent-type-imports': [
          2,
          {
            disallowTypeAnnotations: true,
            fixStyle: 'separate-type-imports',
            prefer: 'type-imports',
          },
        ],
        '@typescript-eslint/consistent-type-exports': [
          2,
          { fixMixedExportsWithInlineTypeSpecifier: false },
        ],
        '@typescript-eslint/no-empty-object-type': [
          2,
          {
            allowInterfaces: 'with-single-extends',
            allowObjectTypes: 'never',
          },
        ],
        '@typescript-eslint/no-restricted-types': [
          2,
          {
            types: {
              '{}': {
                message: `
- If you want to represent an empty object, use \`type EmptyObject = Record<string, never>\`.
- If you want to represent an object literal, use either \`type AnyObject = Record<string, any>\` or \`object\`.
- If you want to represent any non-nullish value, use \`type AnyNonNullishValue = NonNullable<unknown>\`.`,
                suggest: [
                  'AnyNonNullishValue',
                  'EmptyObject',
                  'AnyObject',
                  'object',
                  'Record<string, never>',
                  'Record<string, any>',
                  'NonNullable<unknown>',
                ],
              },
            },
          },
        ],
        '@typescript-eslint/no-namespace': [
          2,
          {
            allowDeclarations: true,
            allowDefinitionFiles: true,
          },
        ],

        // TODO: Enable this later.
        '@typescript-eslint/consistent-type-definitions': [0, 'type'],
        '@typescript-eslint/no-require-imports': [
          2,
          {
            allow: [],
            allowAsImport: true,
          },
        ],
        'sort-imports': [
          2,
          {
            allowSeparatedGroups: true,
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          },
        ],

        ...disabledRules,
      },

      linterOptions: {
        reportUnusedDisableDirectives: 2,
      },
    },

    {
      name: `${packageName}/commonjs-files`,
      files: ['**/*.cjs'],
      languageOptions: {
        sourceType: 'commonjs',
      },

      rules: {
        '@typescript-eslint/no-require-imports': [
          0,
          {
            allow: [],
            allowAsImport: false,
          },
        ],
      },
    },

    prettierConfig,
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

export type { TSESLint } from '@typescript-eslint/utils'
export type { ConfigWithExtends } from 'typescript-eslint'
