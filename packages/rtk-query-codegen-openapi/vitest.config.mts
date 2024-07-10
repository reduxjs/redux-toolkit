import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// No __dirname under Node ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    alias: process.env.TEST_DIST
      ? {
          '@rtk-query/codegen-openapi': path.join(__dirname, 'node_modules/@rtk-query/codegen-openapi'),
        }
      : undefined,
    testTimeout: 10_000,
    pool: 'forks',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
