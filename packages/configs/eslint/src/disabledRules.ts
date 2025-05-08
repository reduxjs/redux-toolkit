import type { Linter } from 'eslint'

/**
 * An object comprised of ESLint rules to disable.
 * These rules are disabled in {@linkcode flatESLintConfig}.
 *
 * @since 0.0.1
 * @public
 */
export const disabledRules = {
  'no-undef': [0, { typeof: false }],
  '@typescript-eslint/no-unused-vars': [
    0,
    {
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/ban-ts-comment': [
    0,
    {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    },
  ],
} as const satisfies Linter.RulesRecord satisfies {
  readonly 'no-undef': [
    0,
    {
      readonly typeof: false
    },
  ]
  readonly '@typescript-eslint/no-unused-vars': [
    0,
    {
      readonly args: 'all'
      readonly argsIgnorePattern: '^_'
      readonly caughtErrors: 'all'
      readonly caughtErrorsIgnorePattern: '^_'
      readonly destructuredArrayIgnorePattern: '^_'
      readonly varsIgnorePattern: '^_'
      readonly ignoreRestSiblings: true
    },
  ]
  readonly '@typescript-eslint/ban-ts-comment': [
    0,
    {
      readonly 'ts-expect-error': 'allow-with-description'
      readonly 'ts-ignore': true
      readonly 'ts-nocheck': true
      readonly 'ts-check': false
      readonly minimumDescriptionLength: 3
    },
  ]
} as {
  readonly 'no-undef': [
    0,
    {
      readonly typeof: false
    },
  ]
  readonly '@typescript-eslint/no-unused-vars': [
    0,
    {
      readonly args: 'all'
      readonly argsIgnorePattern: '^_'
      readonly caughtErrors: 'all'
      readonly caughtErrorsIgnorePattern: '^_'
      readonly destructuredArrayIgnorePattern: '^_'
      readonly varsIgnorePattern: '^_'
      readonly ignoreRestSiblings: true
    },
  ]
  readonly '@typescript-eslint/ban-ts-comment': [
    0,
    {
      readonly 'ts-expect-error': 'allow-with-description'
      readonly 'ts-ignore': true
      readonly 'ts-nocheck': true
      readonly 'ts-check': false
      readonly minimumDescriptionLength: 3
    },
  ]
}
