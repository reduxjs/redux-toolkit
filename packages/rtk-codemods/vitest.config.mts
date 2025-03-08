import { createVitestConfig } from '@reduxjs/vitest-config'
import * as path from 'node:path'

const vitestConfig = createVitestConfig({
  test: {
    dir: path.join(import.meta.dirname, 'transforms'),
    root: import.meta.dirname,
  },
})

export default vitestConfig
