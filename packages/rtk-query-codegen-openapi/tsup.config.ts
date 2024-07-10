import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

const tsconfig = 'tsconfig.json' satisfies Options['tsconfig'];

export default defineConfig((options): Options[] => {
  const commonOptions: Options = {
    entry: { index: 'src/index.ts' },
    sourcemap: true,
    tsconfig,
    clean: true,
    target: ['esnext'],
    outDir: 'lib',
    splitting: false,
    shims: true,
    ...options,
  };

  return [
    { ...commonOptions, name: 'ESM', format: ['esm'], entry: { index: 'src/index.ts' }, dts: true },
    { ...commonOptions, name: 'CJS', format: ['cjs'], entry: { index: 'src/index.ts' }, dts: true },
    {
      ...commonOptions,
      format: ['esm', 'cjs'],
      name: 'BIN',
      entry: { 'bin/cli': 'src/bin/cli.ts' },
    },
  ];
});
