#!/usr/bin/env node

import path = require('path')
import program = require('commander')

// tslint:disable-next-line
const meta = require('../../package.json')
import { generateApi } from '../generate'

program
  .version(meta.version)
  .usage('<directory...>')
  .parse(process.argv)

const schemaAbsPath = path.resolve(process.cwd(), program.args[0])
if (program.args.length !== 1) {
  program.help()
} else {
  generateApi(schemaAbsPath, {}).then(sourceCode => console.log(sourceCode))
}
