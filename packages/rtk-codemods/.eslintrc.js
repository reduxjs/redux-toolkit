module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    project: true,
    tsconfigRootDir: __dirname,
  },

  plugins: ['prettier', 'node'],
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:node/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  env: {
    node: true,
  },
  rules: {},
  overrides: [
    {
      files: ['__tests__/**/*.js'],
      env: {
        jest: true,
      },
    },
  ],
};
