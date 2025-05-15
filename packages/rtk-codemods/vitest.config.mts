import { createVitestProject } from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = createVitestProject({
  root: import.meta.dirname,

  test: {
    dir: path.join(import.meta.dirname, 'transforms'),
    name: packageJson.name,
    root: import.meta.dirname,
  },
})

export default vitestConfig
