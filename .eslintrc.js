module.exports = {
  extends: [
    'react-app',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'jsx-a11y/href-no-hash': 'off',
    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // Silence some bizarre "rule not found" TSLint error
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off'
  }
}
