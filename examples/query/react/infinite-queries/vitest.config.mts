import type { UserWorkspaceConfig } from '@reduxjs/vitest-config'
import { createVitestProject } from '@reduxjs/vitest-config'
import react from '@vitejs/plugin-react'
import * as path from 'node:path'
import packageJson from './package.json' with { type: 'json' }

// https://vitejs.dev/config/
const vitestConfig = createVitestProject({
  plugins: [react()] as UserWorkspaceConfig['plugins'],
  server: {
    open: true,
  },

  root: import.meta.dirname,

  test: {
    dir: import.meta.dirname,
    name: packageJson.name,
    root: import.meta.dirname,

    typecheck: {
      tsconfig: path.join(import.meta.dirname, 'tsconfig.app.json'),
    },

    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    clearMocks: true,
  },
})

export default vitestConfig
