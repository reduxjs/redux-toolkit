import type { TSESLint } from '@typescript-eslint/utils'
import type { Linter } from 'eslint'
import { disabledRules } from './disabledRules.js'
import { configs, js, prettierConfig } from './external.js'
import { globalIgnores } from './globalIgnores.js'
import { globals } from './globals.js'
import { packageJsonName } from './packageJsonName.js'

/**
 * Flat ESLint configuration tailored for projects using TypeScript.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `eslint.config.mts` or `eslint.config.mjs`__</caption>
 *
 * ```ts
 * import { flatESLintConfig } from '@reduxjs/eslint-config'
 *
 * export default flatESLintConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { flatESLintConfig } = require('@reduxjs/eslint-config')
 *
 * module.exports = flatESLintConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cjs` or `eslint.config.cts` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/eslint-config')).flatESLintConfig)()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `eslint.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import eslintConfigModule = require('@reduxjs/eslint-config')
 * import flatESLintConfig = eslintConfigModule.flatESLintConfig
 *
 * export = flatESLintConfig
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const flatESLintConfig = [
  // `ignores` must be first.
  // config with just `ignores` is the replacement for `.eslintignore`
  globalIgnores,

  {
    name: `${js.meta.name}/recommended`,
    ...js.configs.recommended,
  } as const satisfies TSESLint.FlatConfig.Config satisfies Linter.Config,

  // TODO: You can remove the type assertion in the next major version of `typescript-eslint`.
  ...(configs.recommended as Linter.Config[]),
  // TODO: You can remove the type assertion in the next major version of `typescript-eslint`.
  ...(configs.stylistic as Linter.Config[]),

  {
    name: `${packageJsonName}/defaults/overrides`,
    languageOptions: {
      globals,
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
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
      '@typescript-eslint/no-explicit-any': [
        2,
        {
          fixToUnknown: false,
          ignoreRestArgs: false,
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        2,
        {
          allowInterfaces: 'never',
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
          allowDeclarations: false,
          allowDefinitionFiles: true,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': [2, 'type'],
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
      '@typescript-eslint/unified-signatures': [
        2,
        {
          ignoreDifferentlyNamedParameters: false,
          ignoreOverloadsWithDifferentJSDoc: false,
        },
      ],
      '@typescript-eslint/no-unnecessary-type-parameters': [2],
      '@typescript-eslint/no-invalid-void-type': [
        2,
        {
          allowAsThisParameter: false,
          allowInGenericTypeArguments: true,
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        2,
        {
          ignoreArrowShorthand: false,
          ignoreVoidOperator: false,
          ignoreVoidReturningFunctions: false,
        },
      ],
      '@typescript-eslint/no-duplicate-type-constituents': [
        2,
        {
          ignoreIntersections: false,
          ignoreUnions: false,
        },
      ],
      '@typescript-eslint/require-await': [2],
      '@typescript-eslint/no-redundant-type-constituents': [2],
      '@typescript-eslint/no-unnecessary-type-arguments': [2],
      '@typescript-eslint/no-unnecessary-type-assertion': [
        2,
        { typesToIgnore: [] },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        2,
        {
          allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
          ignoreBooleanCoercion: false,
          ignoreConditionalTests: true,
          ignoreIfStatements: false,
          ignoreMixedLogicalExpressions: false,
          ignorePrimitives: {
            bigint: false,
            boolean: false,
            number: false,
            string: false,
          },
          ignoreTernaryTests: false,
        },
      ],
      '@typescript-eslint/no-inferrable-types': [
        2,
        {
          ignoreParameters: false,
          ignoreProperties: false,
        },
      ],
      '@typescript-eslint/no-require-imports': [
        2,
        {
          allow: [],
          allowAsImport: true,
        },
      ],
      'object-shorthand': [
        2,
        'always',
        {
          avoidExplicitReturnArrows: true,
          avoidQuotes: true,
          ignoreConstructors: true,
          methodsIgnorePattern: '',
        },
      ],

      ...disabledRules,
    },

    linterOptions: {
      reportUnusedDisableDirectives: 2,
      reportUnusedInlineConfigs: 2,
    },
  } as const satisfies TSESLint.FlatConfig.Config satisfies Linter.Config,

  {
    name: `${packageJsonName}/commonjs-files`,
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
  } as const satisfies TSESLint.FlatConfig.Config satisfies Linter.Config,

  prettierConfig,
] as const satisfies Linter.Config[]
