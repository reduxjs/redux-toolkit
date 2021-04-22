const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./test/tsconfig');
const { resolve, dirname } = require('path');

const tsConfigPath = require.resolve('./test/tsconfig');
const baseUrl = resolve(dirname(tsConfigPath), compilerOptions.baseUrl);

/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  rootDir: './test',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: `${baseUrl}/`,
  }),
  globals: {
    'ts-jest': {
      tsconfig: tsConfigPath,
    },
  },
  timers: 'fake',
};

module.exports = config;
