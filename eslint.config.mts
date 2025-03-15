import { createESLintConfig } from '@reduxjs/eslint-config'

const eslintConfig = createESLintConfig([
  {
    name: 'root-workspace/global-ignores',
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
    files: [
      'examples/type-portability/nodenext-cjs/**/*.{c,m,}{t,j}s{,x}',
      'examples/query/react/graphql-codegen/src/mocks/schema.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': [0],
    },
  },
  {
    files: ['examples/type-portability/nodenext-cjs/**/*.{c,m,}{t,j}s{,x}'],
    rules: {
      '@typescript-eslint/no-namespace': [0],
    },
  },
])

export default eslintConfig
