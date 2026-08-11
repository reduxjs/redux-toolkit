import * as path from 'node:path';
import type { InlineConfig, Rolldown, TsdownPlugin, UserConfig, UserConfigFn } from 'tsdown';
import { defineConfig } from 'tsdown';
import packageJson from './package.json' with { type: 'json' };

/**
 * @internal
 */
const cwd = import.meta.dirname;

/**
 * @internal
 */
const sourceRootDirectory = path.join(cwd, 'src');

/**
 * Matches declaration file extensions (`.d.ts`, `.d.cts` and `.d.mts`).
 *
 * @internal
 */
const RE_DTS = /\.d\.([cm]?)ts$/;

/**
 * A {@linkcode TsdownPlugin | Tsdown plugin} to remove generated CommonJS
 * (`.cjs`) JavaScript outputs from DTS-only builds. When generating type
 * definition builds we may still emit stray `.cjs` files; this plugin deletes
 * those entries from the generated bundle to ensure only declaration artifacts
 * remain.
 *
 * @returns A {@linkcode TsdownPlugin | Tsdown plugin} that prunes `.cjs` files from the bundle.
 * @internal
 */
const removeCJSOutputsFromDTSBuilds = (): TsdownPlugin => ({
  generateBundle: {
    handler(outputOptions, bundle, isWrite): void {
      if (outputOptions.format === 'cjs' && isWrite) {
        Object.values(bundle).forEach((outputChunk) => {
          if (outputChunk.type === 'chunk' && outputChunk.isEntry && !RE_DTS.test(outputChunk.fileName)) {
            delete bundle[outputChunk.fileName];
            delete bundle[`${outputChunk.fileName}.map`];
          }
        });
      }
    },

    order: 'pre',
  },

  name: `${packageJson.name}:remove-cjs-outputs-from-dts-builds`,
});

/**
 * @internal
 */
const peerAndProductionDependencies = Object.keys({
  ...packageJson.dependencies,
  // ...packageJson.peerDependencies,
} as const) satisfies Extract<Rolldown.ExternalOption, unknown[]>;

const tsdownConfig: UserConfigFn = defineConfig((cliOptions) => {
  const commonOptions = {
    checks: {
      // TODO: Resolve circular dependency issues and re-enable this check.
      circularDependency: false,
    },
    cjsDefault: false,
    clean: false,
    cwd,
    deps: {
      onlyBundle: [],
      neverBundle: peerAndProductionDependencies,
    },
    devtools: {
      clean: true,
      enabled: true,
    },
    dts: false,
    entry: {
      index: 'src/index.ts',
    },
    failOnWarn: true,
    fixedExtension: false,
    format: ['cjs', 'esm'],
    hash: false,
    inputOptions: (options) =>
      ({
        ...options,
        experimental: {
          ...options.experimental,
          lazyBarrel: true,
          nativeMagicString: true,
        },
        transform: {
          ...options.transform,
          typescript: {
            ...options.transform?.typescript,
            optimizeConstEnums: true,
            optimizeEnums: true,
          },
        },
      }) as const satisfies Rolldown.InputOptions,
    minify: false,
    name: packageJson.name,
    nodeProtocol: true,
    outDir: 'lib',
    outputOptions: (options, format, context) =>
      ({
        ...options,
        codeSplitting: false,
        comments: {
          annotation: true,
          jsdoc: false,
          legal: true,
        },
        ...(format === 'cjs' && !context.cjsDts
          ? {
              externalLiveBindings: false,
            }
          : {}),
        strict: true,
      }) as const satisfies Rolldown.OutputOptions,
    platform: 'node',
    root: sourceRootDirectory,
    shims: true,
    sourcemap: true,
    target: ['esnext'],
    treeshake: {
      moduleSideEffects: false,
    },
    tsconfig: path.join(cwd, 'tsconfig.build.json'),
    ...cliOptions,
  } as const satisfies InlineConfig;

  return [
    {
      ...commonOptions,
      format: ['esm'],
      name: `${packageJson.name}-ESM`,
    },
    {
      ...commonOptions,
      format: ['cjs'],
      name: `${packageJson.name}-CJS`,
    },
    {
      ...commonOptions,
      deps: {
        ...commonOptions.deps,
        neverBundle: [...peerAndProductionDependencies, packageJson.name],
      },
      dts: {
        build: false,
        cjsDefault: false,
        cwd: commonOptions.cwd,
        dtsInput: false,
        eager: false,
        emitDtsOnly: false,
        emitJs: false,
        enabled: true,
        generator: 'tsc',
        incremental: false,
        logger: console,
        newContext: false,
        oxc: {},
        parallel: false,
        resolver: 'tsc',
        sideEffects: false,
        sourcemap: true,
        tsconfig: commonOptions.tsconfig,
        tsgo: {},
        vue: false,
      },
      entry: {
        'bin/cli': 'src/bin/cli.ts',
      },
      minify: true,
      name: `${packageJson.name}-CLI`,
    },
    {
      ...commonOptions,
      dts: {
        build: false,
        cjsDefault: false,
        cwd: commonOptions.cwd,
        dtsInput: false,
        eager: false,
        emitDtsOnly: true,
        emitJs: false,
        enabled: true,
        generator: 'tsc',
        incremental: false,
        logger: console,
        newContext: false,
        oxc: {},
        parallel: false,
        resolver: 'tsc',
        sideEffects: false,
        sourcemap: true,
        tsconfig: commonOptions.tsconfig,
        tsgo: {},
        vue: false,
      },
      name: `${packageJson.name}-DTS`,
      plugins: [removeCJSOutputsFromDTSBuilds()],
    },
  ] as const satisfies UserConfig[];
});

export default tsdownConfig;
