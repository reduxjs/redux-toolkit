module.exports = {
  extends: ['react-app', 'prettier'],
  parser: '@typescript-eslint/parser',
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    'react/react-in-jsx-scope': 'off',
    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // Silence some bizarre "rule not found" TSLint error
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    'no-redeclare': 'off',
    // Silence some bizarre "rule not found" TSLint error
    '@typescript-eslint/no-redeclare': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: false },
    ],
  },
  overrides: [
    // {
    //   // only add after https://github.com/typescript-eslint/typescript-eslint/pull/3463 is merged
    //   files: ['src/**/*.ts'],
    //   excludedFiles: [
    //     '**/tests/*.ts',
    //     '**/tests/**/*.ts',
    //     '**/tests/*.tsx',
    //     '**/tests/**/*.tsx',
    //   ],
    //   parserOptions: {
    //     project: './tsconfig.json',
    //   },
    //   rules: {
    //     '@typescript-eslint/prefer-readonly-parameter-types': [
    //       'warn',
    //       { arraysAndTuplesOnly: true },
    //     ],
    //   },
    // },
    {
      files: [
        'packages/toolkit/src/tests/*.ts',
        'packages/toolkit/src/**/tests/*.ts',
        'packages/toolkit/src/**/tests/*.tsx',
      ],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
        'no-lone-blocks': 'off',
        'no-sequences': 'off',
      },
    },
  ],
}
