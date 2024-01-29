import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// No __dirname under Node ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      // this mapping is disabled as we want `dist` imports in the tests only to be used for "type-only" imports which don't play a role for jest
      //'^@reduxjs/toolkit/dist/(.*)$': '<rootDir>/src/*',
      '@internal': path.join(__dirname, './src'),
    },
  },
})
