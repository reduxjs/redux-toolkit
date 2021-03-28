module.exports = {
  extends: [
    'react-app',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    'no-redeclare': 'off',
    // Silence some bizarre "rule not found" TSLint error
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
  }
}
