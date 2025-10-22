import type { Linter } from 'eslint'

/**
 * An object comprised of ESLint rules to disable.
 * These rules are disabled in {@linkcode flatESLintConfig}.
 *
 * @since 0.0.1
 * @public
 */
export const disabledRules = {
  'no-undef': [
    0,
    {
      typeof: false,
    },
  ],
  '@typescript-eslint/no-unused-vars': [
    0,
    {
      args: 'all',
      // Not included in default options
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      // Not included in default options
      caughtErrorsIgnorePattern: '^_',
      // Not included in default options
      destructuredArrayIgnorePattern: '^_',
      ignoreClassWithStaticInitBlock: false,
      ignoreRestSiblings: true,
      reportUsedIgnorePattern: false,
      vars: 'all',
      // Not included in default options
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/ban-ts-comment': [
    0,
    {
      'ts-check': false,
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      minimumDescriptionLength: 3,
    },
  ],
} as const satisfies Linter.RulesRecord satisfies Record<
  keyof Linter.RulesRecord,
  [
    ruleSeverity: Extract<Linter.Severity, 0>,
    ...ruleOptions: readonly unknown[],
  ]
>
