import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export const reduxVitestConfig = defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    setupFiles: ['./vitest.setup.ts'],
  },
  define: { 'import.meta.vitest': 'undefined' },
})

export default reduxVitestConfig
