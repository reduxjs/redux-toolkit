import type { UserConfig as TsdownOptions } from 'tsdown';
import { defineConfig } from 'tsdown';

const tsconfig = 'tsconfig.build.json' satisfies TsdownOptions['tsconfig'];

export default defineConfig((options): TsdownOptions[] => {
  const commonOptions: TsdownOptions = {
    entry: { index: 'src/index.ts' },
    sourcemap: true,
    tsconfig,
    clean: true,
    target: ['esnext'],
    outDir: 'lib',
    nodeProtocol: false,
    shims: true,
    hash: false,
    dts: false,
    ...options,
  };

  return [
    { ...commonOptions, name: 'Modern ESM', format: ['esm'], entry: { index: 'src/index.ts' }, dts: true },
    {
      ...commonOptions,
      name: 'CJS Development',
      format: ['cjs'],
      entry: { index: 'src/index.ts' },
      dts: true,
      // tsup emitted `.js`/`.d.ts` for the CJS build; tsdown defaults to
      // `.cjs`/`.d.cts`, which would break the published `exports` map.
      outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    },
    {
      ...commonOptions,
      format: ['esm'],
      name: 'CLI Development',
      deps: { neverBundle: ['@rtk-query/codegen-openapi'] },
      minify: true,
      entry: { 'bin/cli': 'src/bin/cli.ts' },
    },
  ];
});
