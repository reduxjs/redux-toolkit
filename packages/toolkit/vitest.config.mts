import { createVitestProject } from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = createVitestProject({
  root: import.meta.dirname,

  test: {
    dir: path.join(import.meta.dirname, 'src'),
    name: packageJson.name,
    root: import.meta.dirname,

    typecheck: {
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },

    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['redux', packageJson.name],
      },
    },

    // TODO: Enable this later.
    unstubGlobals: false,
  },
})

export default vitestConfig
