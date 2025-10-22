import {
  defineConfig,
  tsconfigPaths,
  vitestConfigDefaults,
} from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = defineConfig({
  define: { ...vitestConfigDefaults.define },
  root: import.meta.dirname,

  plugins: [tsconfigPaths()],
  test: {
    ...vitestConfigDefaults.test,
    dir: path.join(import.meta.dirname, 'packages'),
    name: packageJson.name,
    root: import.meta.dirname,
    projects: ['packages/*/vitest.config.mts'],
  },
})

export default vitestConfig
