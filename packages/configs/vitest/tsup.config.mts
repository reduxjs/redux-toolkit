import type { Options } from 'tsup'
import { defineConfig } from 'tsup'

const tsconfig = 'tsconfig.build.json' satisfies Options['tsconfig']

const tsupConfig = defineConfig((overrideOptions): Options[] => {
  const commonOptions = {
    clean: true,
    entry: { index: 'src/index.mts' },
    removeNodeProtocol: false,
    shims: true,
    sourcemap: true,
    splitting: false,
    target: ['esnext'],
    tsconfig,
    ...overrideOptions,
  } satisfies Options

  return [
    {
      ...commonOptions,
      name: 'Modern ESM',
      format: ['esm'],
    },
    {
      ...commonOptions,
      name: 'CJS Development',
      format: ['cjs'],

      // Causes `ERR_REQUIRE_ESM` error in CommonJS modules since
      // it is an ESM module (has `"type": "module"` in its `package.json`),
      // and cannot be imported using the `require` syntax,
      // we can inline it to get around this problem.
      noExternal: ['vite-tsconfig-paths'],
      external: ['debug', 'globrex', 'tsconfck'],
    },
    {
      ...commonOptions,
      name: 'ESM Type definitions',
      dts: { only: true },
      format: ['esm'],
    },
    {
      ...commonOptions,
      name: 'CJS Type definitions',
      dts: { only: true },
      format: ['cjs'],
    },
  ]
})

export default tsupConfig
