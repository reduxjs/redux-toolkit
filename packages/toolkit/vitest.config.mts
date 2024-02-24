import { createVitestConfig } from '@reduxjs/vitest-config'

export default createVitestConfig({
  test: {
    environment: 'jsdom',
    server: { deps: { inline: ['redux', '@reduxjs/toolkit'] } },
  },
})
