#!/usr/bin/env node

import program from 'commander';

// tslint:disable-next-line
const meta = require('../../package.json');
import { generateEndpoints } from '../';
import { CommonOptions, ConfigFile, OutputFileOptions } from '../types';

program.version(meta.version).usage('</path/to/config.js>').parse(process.argv);

if (program.args.length === 0 || !(program.args[0].endsWith('.js') || program.args[0].endsWith('.json'))) {
  program.help();
} else {
  run(program.args[0]);
}

async function run(configFile: string) {
  const fullConfig: ConfigFile = require(configFile);

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

  for (const config of outFiles) {
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
