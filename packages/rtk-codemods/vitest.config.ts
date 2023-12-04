import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [],
    include: ['./transforms/**/*.(spec|test).[jt]s?(x)'],
    alias: {},
    deps: {
      interopDefault: true,
    },
  },
});
