#!/usr/bin/env node

import { generateEndpoints, parseConfig } from '@rtk-query/codegen-openapi';
import program from 'commander';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { registerTsLoader } from './registerTsLoader';

/**
 * A CommonJS `require` bound to this file, used to resolve optional
 * TypeScript runtimes and the config file itself.
 *
 * @internal
 */
const require = createRequire(__filename);

/**
 * A CommonJS `require` bound to the current working directory.
 *
 * Depending on the package manager, the CLI may be installed next to the
 * project it generates into or hoisted somewhere above it, so the optional
 * TypeScript loaders are not always reachable from `__filename`. This looks
 * for them from the project directory too.
 *
 * @internal
 */
const requireFromCwd = createRequire(resolve(process.cwd(), 'noop.js'));

/**
 * Whether a runtime capable of loading a TypeScript config file was
 * successfully registered.
 *
 * @internal
 */
const ts = registerTsLoader([requireFromCwd, require]) !== undefined;

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
    console.error('Encountered a TypeScript configfile, but none of esbuild-runner, ts-node or tsx are installed.');
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
