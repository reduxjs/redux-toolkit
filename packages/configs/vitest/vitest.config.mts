import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export const vitestConfig = defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    setupFiles: ['./vitest.setup.ts'],
  },
})

export default vitestConfig
