import { reduxESLintConfig } from '@reduxjs/eslint-config'

/**
 * @type {typeof reduxESLintConfig}
 * @satisfies {import('eslint').Linter.Config[]}
 */
const eslintConfig = [...reduxESLintConfig]

export default eslintConfig
