/**
 * @type {import('eslint').Linter.Config}
 */
const eslintConfig = {
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      2,
      { fixStyle: 'separate-type-imports' },
    ],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist'],
  root: true,
  overrides: [
    { files: ['*.{c,m,}{t,j}s', '*.{t,j}sx'] },
    { files: ['*{test,spec}.{t,j}s?(x)'], env: { jest: true } },
  ],
}

export default eslintConfig
