#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import program from 'commander';

// tslint:disable-next-line
const meta = require('../../package.json');
import { generateApi } from '../generate';
import { GenerationOptions } from '../types';
import { isValidUrl, MESSAGES, prettify } from '../utils';
import { getCompilerOptions } from '../utils/getTsConfig';

program
  .version(meta.version)
  .usage('</path/to/some-swagger.yaml>')
  .option('--exportName <name>', 'change RTK Query Tree root name')
  .option('--reducerPath <path>', 'pass reducer path')
  .option('--baseQuery <name>', 'pass baseQuery name')
  .option('--argSuffix <name>', 'pass arg suffix')
  .option('--responseSuffix <name>', 'pass response suffix')
  .option('--baseUrl <url>', 'pass baseUrl')
  .option('-h, --hooks', 'generate React Hooks')
  .option('-c, --config <path>', 'pass tsconfig path for resolve path alias')
  .option('-f, --file <filename>', 'output file name (ex: generated.api.ts)')
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
} else {
  const schemaLocation = program.args[0];

  const schemaAbsPath = isValidUrl(schemaLocation) ? schemaLocation : path.resolve(process.cwd(), schemaLocation);

  const options = [
    'exportName',
    'reducerPath',
    'baseQuery',
    'argSuffix',
    'responseSuffix',
    'baseUrl',
    'hooks',
    'file',
    'config',
  ] as const;

  const outputFile = program['file'];
  let tsConfigFilePath = program['config'];

  if (tsConfigFilePath) {
    tsConfigFilePath = path.resolve(tsConfigFilePath);
    if (!fs.existsSync(tsConfigFilePath)) {
      throw Error(MESSAGES.TSCONFIG_FILE_NOT_FOUND);
    }
  }

  const compilerOptions = getCompilerOptions(tsConfigFilePath);

  const generateApiOptions = {
    ...options.reduce(
      (s, key) =>
        program[key]
          ? {
              ...s,
              [key]: program[key],
            }
          : s,
      {} as GenerationOptions
    ),
    outputFile,
    compilerOptions,
  };
  generateApi(schemaAbsPath, generateApiOptions)
    .then(async (sourceCode) => {
      const outputFile = program['file'];
      if (outputFile) {
        fs.writeFileSync(path.resolve(process.cwd(), outputFile), await prettify(outputFile, sourceCode));
      } else {
        console.log(await prettify(null, sourceCode));
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
