import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import jestPlugin from 'eslint-plugin-jest'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'
import { config, configs } from 'typescript-eslint'

const eslintConfig = config(
  {
    name: 'global-ignores',
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
      '**/.expo/',
      '**/*.snap',
    ],
  },
  {
    name: `${js.meta.name}/recommended`,
    ...js.configs.recommended,
  },
  configs.strictTypeChecked,
  configs.stylisticTypeChecked,
  {
    name: `${jestPlugin.meta.name}/recommended`,
    ...jestPlugin.configs['flat/recommended'],
  },
  {
    name: 'eslint-plugin-react/jsx-runtime',
    ...reactPlugin.configs.flat['jsx-runtime'],
  },
  reactHooksPlugin.configs['recommended-latest'],
  {
    name: 'main',
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-undef': [0],
      'no-restricted-imports': [
        2,
        {
          paths: [
            {
              name: 'react-redux',
              importNames: ['useSelector', 'useStore', 'useDispatch'],
              message:
                'Please use pre-typed versions from `src/app/hooks.ts` instead.',
            },
          ],
        },
      ],
      '@typescript-eslint/consistent-type-definitions': [2, 'type'],
      '@typescript-eslint/consistent-type-imports': [
        2,
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
    },

    linterOptions: {
      reportUnusedDisableDirectives: 2,
    },
  },
  {
    name: 'commonjs-files',
    files: ['metro.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': [
        0,
        { allow: [], allowAsImport: false },
      ],
    },
  },

  prettierConfig,
)

export default eslintConfig
