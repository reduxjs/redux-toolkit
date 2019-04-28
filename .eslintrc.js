module.exports = {
  extends: 'react-app',
  parser: '@typescript-eslint/parser',

  rules: {
    'jsx-a11y/href-no-hash': 'off',
    // Taken care of by TypeScript's `noUnusedLocals` / `noUnusedParameters`
    'no-unused-vars': 'off'
  }
}
