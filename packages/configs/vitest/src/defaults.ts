import type { Plugin, UserWorkspaceConfig, ViteUserConfig } from 'vitest/config'
import { plugins } from './plugins.js'

/**
 * Default configuration for {@linkcode vitestProject}.
 *
 * @since 0.0.1
 * @public
 */
export const vitestProjectDefaults = {
  define: {
    'import.meta.vitest': 'undefined',
  },

  plugins,

  test: {
    clearMocks: true,
    globals: true,

    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },

    unstubEnvs: true,
    unstubGlobals: true,
  },
} as const satisfies UserWorkspaceConfig satisfies {
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
  readonly plugins: [Plugin<any>]
  readonly test: {
    readonly clearMocks: true
    readonly globals: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly unstubGlobals: true
  }
} as {
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
  readonly plugins: [Plugin<any>]
  readonly test: {
    readonly clearMocks: true
    readonly globals: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly unstubGlobals: true
  }
}

/**
 * Default configuration for {@linkcode vitestConfig}.
 *
 * @since 0.0.1
 * @public
 */
export const vitestConfigDefaults = {
  ...vitestProjectDefaults,

  test: {
    ...vitestProjectDefaults.test,

    coverage: {
      extension: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'],
      include: ['src'],
    },

    reporters: process.env.GITHUB_ACTIONS
      ? ([['default', { summary: false }], ['github-actions']] as const)
      : ([['default']] as const),

    watch: false,
  },
} as const satisfies ViteUserConfig satisfies {
  readonly test: {
    readonly coverage: {
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
      readonly include: ['src']
    }
    readonly reporters:
      | [['default']]
      | [
          [
            'default',
            {
              readonly summary: false
            },
          ],
          ['github-actions'],
        ]
    readonly watch: false
    readonly clearMocks: true
    readonly globals: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly unstubGlobals: true
  }
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
  readonly plugins: [Plugin<any>]
} as {
  readonly test: {
    readonly coverage: {
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
      readonly include: ['src']
    }
    readonly reporters:
      | [['default']]
      | [
          [
            'default',
            {
              readonly summary: false
            },
          ],
          ['github-actions'],
        ]
    readonly watch: false
    readonly clearMocks: true
    readonly globals: true
    readonly typecheck: {
      readonly enabled: true
      readonly tsconfig: './tsconfig.json'
    }
    readonly unstubEnvs: true
    readonly unstubGlobals: true
  }
  readonly define: {
    readonly 'import.meta.vitest': 'undefined'
  }
  readonly plugins: [Plugin<any>]
}
