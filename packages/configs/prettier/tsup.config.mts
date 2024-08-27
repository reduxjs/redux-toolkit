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
