import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { generateApi } from './generate';
import type { CommonOptions, ConfigFile, GenerationOptions, OutputFileOptions } from './types';
import { isValidUrl, prettify } from './utils';
export type { ConfigFile } from './types';

/**
 * A CommonJS `require` bound to this file, used to resolve the
 * TypeScript copies that `oazapfts` and this package each load.
 *
 * @internal
 */
const require = createRequire(__filename);

/**
 * Generates RTK Query endpoints from an OpenAPI schema and returns the
 * formatted source code.
 *
 * @param options - The generation options, without {@linkcode OutputFileOptions.outputFile | outputFile}.
 * @returns A {@linkcode Promise | promise} resolving to the generated source code.
 *
 * @since 1.0.0
 * @public
 */
export async function generateEndpoints(
  options: Omit<GenerationOptions, 'outputFile'> & { outputFile?: never }
): Promise<string>;

/**
 * Generates RTK Query endpoints from an OpenAPI schema and writes the
 * formatted source code to
 * {@linkcode OutputFileOptions.outputFile | outputFile}.
 *
 * @param options - The generation options, including {@linkcode OutputFileOptions.outputFile | outputFile}.
 * @returns A {@linkcode Promise | promise} resolving once the file has been written.
 *
 * @since 1.0.0
 * @public
 */
export async function generateEndpoints(
  options: Omit<GenerationOptions, 'outputFile'> & Required<Pick<GenerationOptions, 'outputFile'>>
): Promise<void>;

export async function generateEndpoints(options: GenerationOptions): Promise<string | void> {
  const schemaLocation = options.schemaFile;

  const schemaAbsPath = isValidUrl(options.schemaFile)
    ? options.schemaFile
    : path.resolve(process.cwd(), schemaLocation);

  const sourceCode = await enforceOazapftsTsVersion(async () => {
    return generateApi(schemaAbsPath, options);
  });
  const { outputFile, prettierConfigFile } = options;
  if (outputFile) {
    fs.writeFileSync(
      path.resolve(process.cwd(), outputFile),
      await prettify(outputFile, sourceCode, prettierConfigFile)
    );
  } else {
    return await prettify(null, sourceCode, prettierConfigFile);
  }
}

/**
 * Flattens a config file into one entry per output file, merging the
 * common options into each entry.
 *
 * A config using `outputFiles` yields one entry per key, with the key used
 * as that entry's {@linkcode OutputFileOptions.outputFile | outputFile}; a
 * single-output config yields exactly one entry.
 *
 * @param fullConfig - The parsed config file.
 * @returns One fully merged options object per output file.
 *
 * @since 1.0.0
 * @public
 */
export function parseConfig(fullConfig: ConfigFile) {
  const outFiles: (CommonOptions & OutputFileOptions)[] = [];

  if ('outputFiles' in fullConfig) {
    const { outputFiles, ...commonConfig } = fullConfig;
    for (const [outputFile, specificConfig] of Object.entries(outputFiles)) {
      outFiles.push({
        ...commonConfig,
        ...specificConfig,
        outputFile,
      });
    }
  } else {
    outFiles.push(fullConfig);
  }
  return outFiles;
}

/**
 * Enforces `oazapfts` to use the same TypeScript version as this module
 * itself uses. That should prevent enums from running out of sync if both
 * libraries use different TS versions.
 *
 * The swap is done by pointing `oazapfts`' `typescript` entry in the
 * require cache at this module's copy for the duration of the callback,
 * then restoring the original entry.
 *
 * @template T - The return type of {@linkcode cb}.
 * @param cb - The callback to run while the TypeScript versions are aligned.
 * @returns Whatever {@linkcode cb} returns.
 *
 * @internal
 */
function enforceOazapftsTsVersion<T>(cb: () => T): T {
  const ozTsPath = require.resolve('typescript', { paths: [require.resolve('oazapfts')] });
  const tsPath = require.resolve('typescript');
  const originalEntry = require.cache[ozTsPath];
  try {
    require.cache[ozTsPath] = require.cache[tsPath];
    return cb();
  } finally {
    if (originalEntry) {
      require.cache[ozTsPath] = originalEntry;
    } else {
      delete require.cache[ozTsPath];
    }
  }
}
