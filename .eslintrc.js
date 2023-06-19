module.exports = {
  extends: ['react-app', 'prettier'],
  extends: [
    'eslint:recommended',
    'prettier',
    'react-app',
    'plugin:node/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    'react/react-in-jsx-scope': 'off',

    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    '@typescript-eslint/no-unused-vars': 'off',

    // These off/not-configured-the-way-we-want lint rules we like & opt into
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: false },
    ],
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks: '(usePossiblyImmediateEffect)',
      },
    ],

    // Todo: investigate whether we'd like these on
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/consistent-indexed-object-style': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/no-confusing-void-expression': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/prefer-function-type': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/sort-type-constituents': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/dot-notation': 'off',
    'no-empty': 'off',
    'prefer-const': 'off',
    'prefer-rest-params': 'off',
  },
  overrides: [
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
