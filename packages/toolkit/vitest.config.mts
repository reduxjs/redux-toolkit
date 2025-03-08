import { createVitestConfig } from '@reduxjs/vitest-config'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = createVitestConfig({
  test: {
    dir: path.join(import.meta.dirname, 'src'),
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
              'node_modules',
              packageJson.name,
            ),
          },
        ]
      : undefined,
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    server: { deps: { inline: ['redux', packageJson.name] } },
  },
})

export default vitestConfig
