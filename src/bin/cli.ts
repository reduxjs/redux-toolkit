#!/usr/bin/env node

import path = require('path')
import program = require('commander')

// tslint:disable-next-line
const meta = require('../../package.json')
import { generateApi, GenerationOptions } from '../generate'

program
  .version(meta.version)
  .usage('<directory...>')
  .option('-exportName, --exportName', 'change RTK Query Tree root name')
  .option('-reducerPath, --reducerPath', 'pass reducer path')
  .option('-baseQuery, --baseQuery', 'pass baseQuery name')
  .option('-argSuffix, --argSuffix', 'pass arg suffix')
  .option('-responseSuffix, --responseSuffix', 'pass response suffix')
  .parse(process.argv)

const schemaAbsPath = path.resolve(process.cwd(), program.args[0])

const options = [
  'exportName',
  'reducerPath',
  'baseQuery',
  'argSuffix',
  'responseSuffix'
] as const

if (program.args.length !== 1) {
  program.help()
} else {
  const generateApiOptions = options.reduce((s, key) => program[key] ? ({
    ...s,
    [key]: program
  }) : s, {} as GenerationOptions);
  generateApi(schemaAbsPath, generateApiOptions).then(sourceCode => console.log(sourceCode))
}
