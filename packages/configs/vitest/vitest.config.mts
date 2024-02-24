import { existsSync } from 'node:fs'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

/**
 * Vitest configuration tailored for internal Redux projects using TypeScript.
 */
export const reduxVitestConfig = defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    setupFiles: existsSync('./vitest.setup.ts') ? ['./vitest.setup.ts'] : [],
  },
  define: { 'import.meta.vitest': 'undefined' },
})

export default reduxVitestConfig
