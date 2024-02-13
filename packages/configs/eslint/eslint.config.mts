import eslint from '@eslint/js'
import { Linter } from 'eslint'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import tsEslint from 'typescript-eslint'
import { vitestGlobals } from './eslint.legacy.config.js'

export { vitestGlobals }

export const reduxESLintConfig: Linter.Config[] = tsEslint.config(
  // `ignores` must be first.
  { ignores: ['dist/', '.*'] },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  ...tsEslint.configs.stylistic,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...vitestGlobals,
        ...globals.nodeBuiltin,
        ...globals.browser,
        ...globals.node,
      },
      parser: tsEslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        ecmaVersion: 'latest',
      },
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
    plugins: { '@typescript-eslint': tsEslint.plugin },
    linterOptions: { reportUnusedDisableDirectives: 2 },
  },
) as Linter.Config[]

export default reduxESLintConfig
