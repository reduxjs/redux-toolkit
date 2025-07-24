import { createVitestProject } from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = createVitestProject({
  root: import.meta.dirname,

  test: {
    dir: path.join(import.meta.dirname, 'test'),
    name: packageJson.name,
    root: import.meta.dirname,

    typecheck: {
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },

    alias: process.env.TEST_DIST
      ? [
          {
            find: packageJson.name,
            replacement: path.join(
              import.meta.dirname,
              '..',
              '..',
              'node_modules',
              packageJson.name,
            ),
          },
        ]
      : undefined,
    setupFiles: ['./test/vitest.setup.ts'],

    // TODO: Enable this later.
    unstubGlobals: false,
  },
})

export default vitestConfig
