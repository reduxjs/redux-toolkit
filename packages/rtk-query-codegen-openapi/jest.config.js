const { resolve } = require('path');

const tsConfigPath = resolve('./test/tsconfig.json');

/** @typedef {import('ts-jest/dist/types')} */
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  rootDir: './test',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: tsConfigPath,
    },
  },
};

module.exports = config;
