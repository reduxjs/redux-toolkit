import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export const vitestConfig = defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    watch: false,
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      // this mapping is disabled as we want `dist` imports in the tests only to be used for "type-only" imports which don't play a role for jest
      //'^@reduxjs/toolkit/dist/(.*)$': '<rootDir>/src/*',
      '@internal': path.resolve('src'),
    },
  },
})

export default vitestConfig
