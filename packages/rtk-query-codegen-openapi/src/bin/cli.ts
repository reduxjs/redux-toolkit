#!/usr/bin/env node

import { generateEndpoints, parseConfig } from '@rtk-query/codegen-openapi';
import program from 'commander';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/**
 * A CommonJS `require` bound to this file, used to resolve optional
 * TypeScript runtimes and the config file itself.
 *
 * @internal
 */
const require = createRequire(__filename);

/**
 * Whether a runtime capable of loading a TypeScript config file was
 * successfully registered.
 *
 * @internal
 */
let ts = false;
try {
  if (require.resolve('esbuild') && require.resolve('esbuild-runner')) {
    require('esbuild-runner/register');
  }
  ts = true;
} catch {}

try {
  if (!ts) {
    if (require.resolve('typescript') && require.resolve('ts-node')) {
      (require('ts-node') as typeof import('ts-node')).register({
        transpileOnly: true,
        compilerOptions: {
          target: 'es6',
          module: 'commonjs',
        },
      });
    }

    ts = true;
  }
} catch {}

// tslint:disable-next-line
/**
 * This package's `package.json`, read for the version reported by
 * `--version`.
 *
 * @internal
 */
const meta = require('../../package.json');

program.version(meta.version).usage('</path/to/config.js>').parse(process.argv);

/**
 * The config file path given on the command line.
 *
 * @internal
 */
const configFile = program.args[0];

if (program.args.length === 0 || !/\.([mc]?(jsx?|tsx?)|jsonc?)?$/.test(configFile)) {
  program.help();
} else {
  if (/\.[mc]?tsx?$/.test(configFile) && !ts) {
    console.error('Encountered a TypeScript configfile, but neither esbuild-runner nor ts-node are installed.');
    process.exit(1);
  }
  run(resolve(process.cwd(), configFile));
}

/**
 * Loads a config file and generates every output file it declares.
 *
 * Changes the working directory to the config file's own directory first,
 * so relative paths in the config resolve against it rather than against
 * the directory the command was run from.
 *
 * @param configFile - The absolute path of the config file to run.
 * @returns A {@linkcode Promise | promise} resolving once every output file has been generated.
 *
 * @internal
 */
async function run(configFile: string) {
  process.chdir(dirname(configFile));

  const unparsedConfig = require(configFile);

  for (const config of parseConfig(unparsedConfig.default ?? unparsedConfig)) {
    try {
      console.log(`Generating ${config.outputFile}`);
      await generateEndpoints(config);
      console.log(`Done`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  }
}
