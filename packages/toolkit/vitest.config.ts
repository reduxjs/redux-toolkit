import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['./src/**/*.(spec|test).[jt]s?(x)'],
    alias: {
      '@reduxjs/toolkit/query/react': './src/query/react/index.ts', // @remap-prod-remove-line
      '@reduxjs/toolkit/query': './src/query/index.ts', // @remap-prod-remove-line
      '@reduxjs/toolkit/react': './src/index.ts', // @remap-prod-remove-line
      '@reduxjs/toolkit': './src/index.ts', // @remap-prod-remove-line

      // this mapping is disabled as we want `dist` imports in the tests only to be used for "type-only" imports which don't play a role for jest
      //'^@reduxjs/toolkit/dist/(.*)$': '<rootDir>/src/*',
      '@internal/': './src/',
    },
    deps: {
      interopDefault: true,
      inline: ['redux', '@reduxjs/toolkit'],
    },
  },
})
