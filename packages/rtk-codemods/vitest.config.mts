import { createVitestConfig } from '@reduxjs/vitest-config'

export default createVitestConfig({
  test: {
    dir: `${import.meta.dirname}/transforms`,
    root: import.meta.dirname,
  },
})
