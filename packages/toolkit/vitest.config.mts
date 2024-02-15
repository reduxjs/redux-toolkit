import { reduxVitestConfig } from '@reduxjs/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  reduxVitestConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      server: { deps: { inline: ['redux', '@reduxjs/toolkit'] } },
    },
  }),
)
