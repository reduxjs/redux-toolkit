import { defineConfig } from 'vitest/config'

const vitestConfig = defineConfig({
  test: {
    watch: false,
    workspace: ['packages/*/vitest.config.mts'],
  },
})

export default vitestConfig
