import { createRequire } from 'node:module';
import path from 'node:path';
import { registerTsLoader } from '../src/bin/registerTsLoader';

const realRequire = createRequire(__filename);

function requireWithout(...hidden: string[]): NodeJS.Require {
  const isHidden = (id: string) => hidden.some((name) => id === name || id.startsWith(`${name}/`));
  const fakeRequire = ((id: string) => {
    if (isHidden(id)) throw new Error(`Cannot find module '${id}'`);
    return realRequire(id);
  }) as NodeJS.Require;
  fakeRequire.resolve = ((id: string) => {
    if (isHidden(id)) throw new Error(`Cannot find module '${id}'`);
    return realRequire.resolve(id);
  }) as NodeJS.RequireResolve;
  return fakeRequire;
}

describe('registerTsLoader', () => {
  test('falls back to tsx when esbuild-runner and ts-node are not installed', () => {
    expect(registerTsLoader([requireWithout('esbuild-runner', 'ts-node')])).toBe('tsx');

    const config = realRequire(path.resolve(__dirname, 'fixtures/tsLoaderConfig.ts'));

    expect(config.default).toEqual({
      schemaFile: './petstore.yaml',
      apiFile: './emptyApi.ts',
      outputFile: '../tmp/example.ts',
    });
  });

  test('returns undefined when no loader is installed', () => {
    expect(registerTsLoader([requireWithout('esbuild-runner', 'ts-node', 'tsx')])).toBeUndefined();
  });
});
