import { createVitestProject } from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = createVitestProject({
  root: import.meta.dirname,

  test: {
    alias: {
      '@reduxjs/toolkit': path.join(
        import.meta.dirname,
        '..',
        'toolkit',
        'src',
      ),
    },
    dir: path.join(import.meta.dirname, 'src'),
    include: ['./**/*.test.ts'],
    name: packageJson.name,
    root: import.meta.dirname,
  },
})

export default vitestConfig
