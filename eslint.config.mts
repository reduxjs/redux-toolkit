import { createESLintConfig } from '@reduxjs/eslint-config'

export default createESLintConfig([
  {
    name: 'root-workspace/global-ignores',
    ignores: [
      'packages/rtk-codemods/transforms/*/__testfixtures__/',
      'examples/',
    ],
  },
  {
    name: 'root-workspace/overrides',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [
            'packages/toolkit/.size-limit.cjs',
            'packages/rtk-query-codegen-openapi/test/config.example.js',
          ],
          defaultProject: './tsconfig.json',
        },
      },
    },
  },
])
