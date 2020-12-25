const fs = require('fs');
const { cp, rm } = require('shelljs');

if (fs.existsSync('dist/ts-4.1')) {
  rm('-r', 'dist/ts-4.1');
}

cp('-r', 'dist/ts/', 'dist/ts-4.1');

const stubTs41Types = `
import { EndpointDefinitions } from './endpointDefinitions';
export declare type TS41Hooks<Definitions extends EndpointDefinitions> = unknown;
export {};
`;

fs.writeFileSync('dist/ts/ts41Types.d.ts', stubTs41Types);

fs.writeFileSync(
  'dist/index.js',
  `
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./index.cjs.production.min.js')
} else {
  module.exports = require('./index.cjs.development.js')
}
`
);
