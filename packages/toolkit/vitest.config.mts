import { createVitestConfig } from '@reduxjs/vitest-config'
import packageJson from './package.json' with { type: 'json' }

export default createVitestConfig({
  test: {
    dir: `${import.meta.dirname}/src`,
    name: packageJson.name,
    root: import.meta.dirname,

    typecheck: {
      tsconfig: `${import.meta.dirname}/tsconfig.json`,
    },

    alias: process.env.TEST_DIST
      ? {
          '@reduxjs/toolkit': new URL(
            'node_modules/@reduxjs/toolkit',
            import.meta.url,
          ).pathname,
        }
      : undefined,
    environment: 'jsdom',
    server: { deps: { inline: ['redux', '@reduxjs/toolkit'] } },
  },
})
