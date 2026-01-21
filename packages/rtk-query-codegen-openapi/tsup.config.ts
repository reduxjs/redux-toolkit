import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

const tsconfig = 'tsconfig.build.json' satisfies Options['tsconfig'];

export default defineConfig((options): Options[] => {
  const commonOptions: Options = {
    entry: { index: 'src/index.ts' },
    sourcemap: true,
    tsconfig,
    clean: true,
    target: ['esnext'],
    outDir: 'lib',
    splitting: false,
    removeNodeProtocol: false,
    shims: true,
    ...options,
  };

  return [
    { ...commonOptions, name: 'Modern ESM', format: ['esm'], entry: { index: 'src/index.ts' }, dts: true },
    { ...commonOptions, name: 'CJS Development', format: ['cjs'], entry: { index: 'src/index.ts' }, dts: true },
    {
      ...commonOptions,
      format: ['cjs', 'esm'],
      name: 'CLI Development',
      dts: true,
      external: ['@rtk-query/codegen-openapi'],
      minify: true,
      entry: { 'bin/cli': 'src/bin/cli.ts' },
    },
  ];
});
