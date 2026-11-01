import { defineConfig } from 'vitest/config'

// Benchmarks import the built package (`dist`) by name, and Node loads it
// natively. Running `src` through Vite's module runner would turn every
// export access into a getter call and distort per-dispatch timings.
export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'production' },
    include: [],
    benchmark: {
      include: ['./bench/**/*.bench.ts'],
    },
    server: {
      deps: {
        external: [/\/dist\//],
      },
    },
  },
})
