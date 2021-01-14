#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import program from 'commander';

// tslint:disable-next-line
const meta = require('../../package.json');
import { generateApi } from '../generate';
import { GenerationOptions } from '../types';
import { isValidUrl, prettify } from '../utils';

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
  .option('--file <filename>', 'output file name (ex: generated.api.ts)')
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
  ] as const;

  const generateApiOptions = options.reduce(
    (s, key) =>
      program[key]
        ? {
            ...s,
            [key]: program[key],
          }
        : s,
    {} as GenerationOptions
  );
  generateApi(schemaAbsPath, generateApiOptions)
    .then(async (sourceCode) => {
      const outputFile = program['file'];
      if (outputFile) {
        fs.writeFileSync(`${process.cwd()}/${outputFile}`, await prettify(outputFile, sourceCode));
      } else {
        console.log(await prettify(null, sourceCode));
      }
    })
    .catch((err) => console.error(err));
}
