import { reduxVitestConfig } from '@reduxjs/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  reduxVitestConfig,
  defineConfig({
    test: {
      pool: 'forks',
      setupFiles: ['./test/vitest.setup.ts'],
    },
  })
);
