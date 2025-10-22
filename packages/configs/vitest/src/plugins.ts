import type { Plugin, PluginOptions } from './external.js'
import { tsconfigPaths } from './external.js'

/**
 * Default configuration for {@linkcode tsconfigPaths}.
 *
 * @since 0.0.1
 * @public
 */
export const tsconfigPathsOptions = {
  configNames: ['tsconfig.json'],
  projects: ['./tsconfig.json'],
} as const satisfies PluginOptions

/**
 * plugins for {@linkcode vitestProjectDefaults}.
 *
 * @since 0.0.1
 * @public
 */
export const plugins = [
  /* @__PURE__ */ tsconfigPaths(tsconfigPathsOptions),
] as const satisfies [Plugin]
