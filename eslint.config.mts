import { createESLintConfig } from '@reduxjs/eslint-config'

const eslintConfig = createESLintConfig([
  {
    name: 'overrides/global-ignores',
    ignores: [
      'packages/rtk-codemods/transforms/*/__testfixtures__/',
      'packages/toolkit/.size-limit.cjs',
      'packages/rtk-query-codegen-openapi/test/config.example.js',
      'examples/publish-ci/',

      // TODO: Remove this later.
      'examples/',
    ],
  },

  {
    name: 'overrides/no-require-imports',
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
    name: 'overrides/nodenext-cjs-type-portability-examples',
    files: ['examples/type-portability/nodenext-cjs/**/*.?(m|c)ts?(x)'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': [
        2,
        {
          allow: [],
          allowAsImport: true,
        },
      ],
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
