import * as path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    tsconfigPaths({
      configNames: ['tsconfig.json'],
      projects: ['./tsconfig.json'],
      root: import.meta.dirname,
    }),
  ],

  root: import.meta.dirname,

  test: {
    name: {
      label: packageJson.name,
    },

    alias: process.env.TEST_DIST
      ? {
          '@rtk-query/codegen-openapi': path.join(
            import.meta.dirname,
            '..',
            '..',
            'node_modules',
            '@rtk-query',
            'codegen-openapi'
          ),
        }
      : undefined,

    dir: path.join(import.meta.dirname, 'test'),
    root: import.meta.dirname,
    testTimeout: 10_000,

    typecheck: {
      enabled: true,
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },

    pool: 'forks',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    watch: false,
  },
});
