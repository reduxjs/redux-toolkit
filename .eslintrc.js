module.exports = {
  extends: ['react-app', 'prettier'],
  parser: '@typescript-eslint/parser',
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // Silence some bizarre "rule not found" TSLint error
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
  },
  overrides: [
    {
      files: ['src/tests/*.ts', 'src/**/tests/*.ts', 'src/**/tests/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
        'no-lone-blocks': 'off',
      },
    },
  ],
}
