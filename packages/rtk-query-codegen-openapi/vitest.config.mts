import { createVitestConfig } from '@reduxjs/vitest-config';

export default createVitestConfig({
  test: {
    alias: process.env.TEST_DIST
      ? {
          '@rtk-query/codegen-openapi': new URL('../../node_modules/@rtk-query/codegen-openapi', import.meta.url)
            .pathname,
        }
      : undefined,
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
