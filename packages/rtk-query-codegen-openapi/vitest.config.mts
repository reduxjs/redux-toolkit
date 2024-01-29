import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    alias: {
      '@': path.join(import.meta.dirname, 'test/fixtures'),
      '@rtk-query/codegen-openapi': path.join(import.meta.dirname, 'src'),
    },
  },
});
