#!/usr/bin/env node

import { generateEndpoints, parseConfig } from '@rtk-query/codegen-openapi';
import program from 'commander';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { registerTsLoader } from './registerTsLoader';

const require = createRequire(__filename);

// Depending on the package manager, the CLI may be installed next to the project it
// generates into or hoisted somewhere above it, so the optional TypeScript loaders are
// not always reachable from `__filename`. Look for them from the project directory too.
const requireFromCwd = createRequire(resolve(process.cwd(), 'noop.js'));

const ts = registerTsLoader([requireFromCwd, require]) !== undefined;

// tslint:disable-next-line
const meta = require('../../package.json');

program.version(meta.version).usage('</path/to/config.js>').parse(process.argv);

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
