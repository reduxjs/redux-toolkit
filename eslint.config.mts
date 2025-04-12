import { createESLintConfig } from '@reduxjs/eslint-config'
import eslintConfigPackageJson from '@reduxjs/eslint-config/package.json' with { type: 'json' }

const basename = `${eslintConfigPackageJson.name}/overrides`

const eslintConfig = createESLintConfig([
  {
    name: `${basename}/global-ignores`,
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
