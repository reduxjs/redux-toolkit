import { createVitestConfig } from '@reduxjs/vitest-config'

export default createVitestConfig({
  test: {
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
