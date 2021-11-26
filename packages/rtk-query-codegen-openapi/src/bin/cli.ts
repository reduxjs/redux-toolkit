#!/usr/bin/env node

import program from 'commander';
import { dirname, resolve } from 'path';
import semver from 'semver';
import ts from 'typescript';
import mock from 'mock-require';

if (!semver.satisfies(ts.version, '>=4.1 <=4.5')) {
  console.warn(
    'Please note that `@rtk-query/codegen-openapi` only has been tested with TS versions 4.1 to 4.5 - other versions might cause problems.'
  );
}

let canHandleTs = false;
try {
  if (require.resolve('esbuild') && require.resolve('esbuild-runner')) {
    require('esbuild-runner/register');
  }
  canHandleTs = true;
} catch {}

try {
  if (!canHandleTs) {
    if (require.resolve('typescript') && require.resolve('ts-node')) {
      (require('ts-node') as typeof import('ts-node')).register({
        transpileOnly: true,
        compilerOptions: {
          target: 'es6',
          module: 'commonjs',
        },
      });
    }

    canHandleTs = true;
  }
} catch {}

// tslint:disable-next-line
const meta = require('../../package.json');

program.version(meta.version).usage('</path/to/config.js>').parse(process.argv);

const configFile = program.args[0];

if (program.args.length === 0 || !/\.(jsx?|tsx?|jsonc?)?$/.test(configFile)) {
  program.help();
} else {
  if (/\.tsx?$/.test(configFile) && !canHandleTs) {
    console.error('Encountered a TypeScript configfile, but neither esbuild-runner nor ts-node are installed.');
    process.exit(1);
  }
  mock('typescript', ts);
  run(resolve(process.cwd(), configFile));
  mock.stop('typescript');
}

async function run(configFile: string) {
  const { generateEndpoints, parseConfig } = require('../');

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
