import tsconfigPaths from 'vite-tsconfig-paths'
import type { Plugin, UserWorkspaceConfig, ViteUserConfig } from 'vitest/config'
import { defineConfig, defineProject, mergeConfig } from 'vitest/config'

const plugins: [Plugin] = [
  /* @__PURE__ */ tsconfigPaths({
    projects: ['./tsconfig.json'],
    configNames: ['tsconfig.json'],
  }),
] as const satisfies [Plugin]

/**
 * Default configuration for {@linkcode reduxVitestProject}.
 *
 * @since 0.0.1
 * @public
 */
export const reduxVitestProjectDefaults: {
  readonly plugins: [Plugin<any>]
  readonly test: {
    readonly clearMocks: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly globals: true
    readonly testTimeout: 10_000
  }
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
} = {
  plugins,

  test: {
    clearMocks: true,

    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },

    unstubEnvs: true,

    globals: true,
    testTimeout: 10_000,
  },

  define: {
    'import.meta.vitest': 'undefined',
  },
} as const satisfies UserWorkspaceConfig

/**
 * Default configuration for {@linkcode reduxVitestConfig}.
 *
 * @since 0.0.1
 * @public
 */
export const reduxVitestConfigDefaults: {
  readonly test: {
    readonly coverage: {
      readonly include: ['src']
      readonly extension: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mts',
        '.mjs',
        '.cts',
        '.cjs',
      ]
    }
    readonly reporters: [['github-actions'], ['verbose']] | [['verbose']]
    readonly watch: false
    readonly clearMocks: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly globals: true
    readonly testTimeout: 10_000
  }
  readonly plugins: [Plugin<any>]
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
} = {
  ...reduxVitestProjectDefaults,

  test: {
    ...reduxVitestProjectDefaults.test,

    coverage: {
      include: ['src'],
      extension: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'],
    },

    reporters: process.env.GITHUB_ACTIONS
      ? ([['github-actions'], ['verbose']] as const)
      : ([['verbose']] as const),

    watch: false,
  },
} as const satisfies ViteUserConfig

/**
 * Vitest configuration tailored for internal Redux projects using TypeScript.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { reduxVitestConfig } from '@reduxjs/vitest-config'
 *
 * export default reduxVitestConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { reduxVitestConfig } = require('@reduxjs/vitest-config')
 *
 * module.exports = reduxVitestConfig
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).reduxVitestConfig)()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import reduxVitestConfigModule = require('@reduxjs/vitest-config')
 * import reduxVitestConfig = reduxVitestConfigModule.reduxVitestConfig
 *
 * export = reduxVitestConfig
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const reduxVitestConfig: ViteUserConfig = /* @__PURE__ */ defineConfig(
  reduxVitestConfigDefaults,
)

/**
 * Vitest configuration tailored for internal Redux projects using TypeScript.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { reduxVitestProject } from '@reduxjs/vitest-config'
 *
 * export default reduxVitestProject
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { reduxVitestProject } = require('@reduxjs/vitest-config')
 *
 * module.exports = reduxVitestProject
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).reduxVitestProject)()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import reduxVitestConfigModule = require('@reduxjs/vitest-config')
 * import reduxVitestProject = reduxVitestConfigModule.reduxVitestProject
 *
 * export = reduxVitestProject
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const reduxVitestProject: UserWorkspaceConfig =
  /* @__PURE__ */ defineProject(reduxVitestConfigDefaults)

/**
 * A function that returns {@linkcode reduxVitestConfig}
 * along with optional additional overrides.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode reduxVitestConfig}, incorporating any provided overrides.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { createVitestConfig } from '@reduxjs/vitest-config'
 *
 * export default createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { createVitestConfig } = require('@reduxjs/vitest-config')
 *
 * module.exports = createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).createVitestConfig({
 *     test: {
 *       environment: 'jsdom',
 *       // Other additional overrides
 *     },
 *   }))()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import reduxVitestConfigModule = require('@reduxjs/vitest-config')
 * import createVitestConfig = reduxVitestConfigModule.createVitestConfig
 *
 * export = createVitestConfig({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const createVitestConfig = (
  additionalOverrides: ViteUserConfig = {},
): ViteUserConfig =>
  /* @__PURE__ */ mergeConfig(reduxVitestConfig, additionalOverrides)

/**
 * A function that returns {@linkcode reduxVitestProject}
 * along with optional additional overrides.
 *
 * @param additionalOverrides - Optional additional overrides to apply to the configuration.
 * @returns An augmented version of the default {@linkcode reduxVitestProject}, incorporating any provided overrides.
 *
 * @example
 * <caption>#### __ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`__</caption>
 *
 * ```ts
 * import { createVitestProject } from '@reduxjs/vitest-config'
 *
 * export default createVitestProject({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)__</caption>
 *
 * ```ts
 * const { createVitestProject } = require('@reduxjs/vitest-config')
 *
 * module.exports = createVitestProject({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)__</caption>
 *
 * ```ts
 * module.exports = (async () =>
 *   (await import('@reduxjs/vitest-config')).createVitestProject({
 *     test: {
 *       environment: 'jsdom',
 *       // Other additional overrides
 *     },
 *   }))()
 * ```
 *
 * @example
 * <caption>#### __CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)__</caption>
 *
 * ```ts
 * import reduxVitestConfigModule = require('@reduxjs/vitest-config')
 * import createVitestProject = reduxVitestConfigModule.createVitestProject
 *
 * export = createVitestProject({
 *   test: {
 *     environment: 'jsdom',
 *     // Other additional overrides
 *   },
 * })
 * ```
 *
 * @since 0.0.1
 * @public
 */
export const createVitestProject = (
  additionalOverrides: UserWorkspaceConfig = {},
): UserWorkspaceConfig =>
  /* @__PURE__ */ mergeConfig(reduxVitestProject, additionalOverrides)

export type { UserWorkspaceConfig, ViteUserConfig } from 'vitest/config'
