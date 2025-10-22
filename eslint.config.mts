import { createESLintConfig } from '@reduxjs/eslint-config'
import eslintConfigPackageJson from '@reduxjs/eslint-config/package.json' with { type: 'json' }

const basename = `${eslintConfigPackageJson.name}/overrides`

const eslintConfig = createESLintConfig([
  {
    name: `${basename}/global-ignores`,
    ignores: [
      'packages/rtk-codemods/transforms/*/__testfixtures__/',
      'packages/toolkit/.size-limit.cjs',
      'packages/rtk-query-codegen-openapi/lib/',
      'packages/rtk-query-codegen-openapi/test/config.example.js',
      'examples/publish-ci/',

      // TODO: Remove this later.
      'examples/',
    ],
  },

  {
    name: `${basename}/main`,
    files: ['**/*.?(c|m)[jt]s?(x)'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TODO: Enable this later.
      '@typescript-eslint/consistent-type-definitions': [0, 'type'],
      '@typescript-eslint/prefer-nullish-coalescing': [0],
      '@typescript-eslint/no-namespace': [0],
      '@typescript-eslint/require-await': [0],
      '@typescript-eslint/unified-signatures': [0],
      '@typescript-eslint/no-unnecessary-type-parameters': [0],
      '@typescript-eslint/no-invalid-void-type': [0],
      '@typescript-eslint/no-unnecessary-type-arguments': [0],
      '@typescript-eslint/no-confusing-void-expression': [0],
      '@typescript-eslint/no-duplicate-type-constituents': [0],
      '@typescript-eslint/no-redundant-type-constituents': [0],
      '@typescript-eslint/no-unnecessary-type-assertion': [0],
      'object-shorthand': [0],
      '@typescript-eslint/no-explicit-any': [
        0,
        {
          fixToUnknown: false,
          ignoreRestArgs: false,
        },
      ],
    },
  },

  {
    name: `${basename}/vitest-custom-matchers-declaration-file`,
    files: ['packages/toolkit/src/tests/utils/CustomMatchers.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        2,
        {
          allowInterfaces: 'with-single-extends',
          allowObjectTypes: 'never',
        },
      ],
    },
  },

  {
    name: `${basename}/no-require-imports`,
    files: ['examples/query/react/graphql-codegen/src/mocks/schema.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': [
        2,
        {
          allow: ['ts-node', '\\./db(.c?[tj]s)?$'],
          allowAsImport: false,
        },
      ],
    },
  },

  {
    name: `${basename}/examples/type-portability/nodenext-cjs`,
    files: ['examples/type-portability/nodenext-cjs/**/*.?(c)ts?(x)'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-namespace': [
        0,
        {
          allowDeclarations: false,
          allowDefinitionFiles: true,
        },
      ],
    },
  },
])

export default eslintConfig
