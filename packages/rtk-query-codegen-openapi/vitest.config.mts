import { createVitestConfig } from '@reduxjs/vitest-config';

export default createVitestConfig({
  test: {
    pool: 'forks',
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
