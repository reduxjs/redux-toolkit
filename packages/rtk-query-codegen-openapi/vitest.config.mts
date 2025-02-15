import { createVitestConfig } from '@reduxjs/vitest-config'
import packageJson from './package.json' with { type: 'json' }

export default createVitestConfig({
  test: {
    dir: `${import.meta.dirname}/test`,
    name: packageJson.name,
    root: import.meta.dirname,

    typecheck: {
      tsconfig: `${import.meta.dirname}/tsconfig.json`,
    },

    alias: process.env.TEST_DIST
      ? {
          '@rtk-query/codegen-openapi': new URL(
            '../../node_modules/@rtk-query/codegen-openapi',
            import.meta.url,
          ).pathname,
        }
      : undefined,
    setupFiles: ['./test/vitest.setup.ts'],
  },
})
