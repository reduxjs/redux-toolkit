import tsconfigPaths from 'vite-tsconfig-paths'
import type { Plugin } from 'vitest/config'

/**
 * A list of plugins to be used with Vitest.
 *
 * @since 0.0.1
 * @public
 */
export const plugins: [Plugin] = [
  /* @__PURE__ */ tsconfigPaths({
    projects: ['./tsconfig.json'],
    configNames: ['tsconfig.json'],
  }),
] as const satisfies [Plugin]
