import { createVitestConfig } from '@reduxjs/vitest-config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const vitestConfig = createVitestConfig({
  plugins: [react()] as ReturnType<typeof createVitestConfig>['plugins'],
  server: {
    open: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    clearMocks: true,
  },
})

export default vitestConfig
