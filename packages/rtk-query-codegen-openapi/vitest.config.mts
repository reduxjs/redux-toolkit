import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    testTimeout: 10_000,
    pool: 'threads',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
