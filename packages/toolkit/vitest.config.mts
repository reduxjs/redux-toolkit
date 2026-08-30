import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['./src/**/*.(spec|test).[jt]s?(x)'],
    server: {
      deps: {
        inline: ['redux', '@reduxjs/toolkit'],
      },
    },
    unstubEnvs: true,
  },
})
