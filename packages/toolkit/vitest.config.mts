import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// No __dirname under Node ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [tsconfigPaths({ root: __dirname })],
  test: {
    alias: process.env.TEST_DIST
      ? {
          '@reduxjs/toolkit': new URL(
            'node_modules/@reduxjs/toolkit',
            import.meta.url,
          ).pathname,
        }
      : undefined,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['./src/**/*.(spec|test).[jt]s?(x)'],
    server: { deps: { inline: ['redux', '@reduxjs/toolkit'] } },
  },
})
