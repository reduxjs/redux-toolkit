/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'modules',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
      external: [
        '@reduxjs/toolkit',
      ]
    },
  },
  test: {
    globals: true,
    testTimeout: 10000,
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
