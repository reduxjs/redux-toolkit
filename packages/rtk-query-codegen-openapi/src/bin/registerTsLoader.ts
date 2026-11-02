export type TsLoader = 'esbuild-runner' | 'ts-node' | 'tsx';

function findLoader(requires: NodeJS.Require[], ids: string[]): NodeJS.Require | undefined {
  for (const candidate of requires) {
    try {
      for (const id of ids) candidate.resolve(id);
      return candidate;
    } catch {}
  }
  return undefined;
}

/**
 * Registers the first TypeScript loader that can be resolved from one of `requires`,
 * so that `require()` can load `.ts` config files. Returns the loader that was used.
 */
export function registerTsLoader(requires: NodeJS.Require[]): TsLoader | undefined {
  try {
    const esbuildRequire = findLoader(requires, ['esbuild', 'esbuild-runner']);
    if (esbuildRequire) {
      esbuildRequire('esbuild-runner/register');
      return 'esbuild-runner';
    }
  } catch {}

  try {
    const tsNodeRequire = findLoader(requires, ['typescript', 'ts-node']);
    if (tsNodeRequire) {
      (tsNodeRequire('ts-node') as typeof import('ts-node')).register({
        transpileOnly: true,
        compilerOptions: {
          target: 'es6',
          module: 'commonjs',
        },
      });
      return 'ts-node';
    }
  } catch {}

  try {
    const tsxRequire = findLoader(requires, ['tsx/cjs/api']);
    if (tsxRequire) {
      (tsxRequire('tsx/cjs/api') as typeof import('tsx/cjs/api')).register();
      return 'tsx';
    }
  } catch {}

  return undefined;
}
