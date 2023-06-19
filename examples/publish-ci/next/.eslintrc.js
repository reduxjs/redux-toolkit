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
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-use-before-define': 'off',
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
  },
}
