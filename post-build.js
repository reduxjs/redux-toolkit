const fs = require('fs');
const { cp, rm } = require('shelljs');

if (fs.existsSync('dist/esm/ts-4.1')) {
  rm('-r', 'dist/esm/ts-4.1');
}

cp('-r', 'dist/esm/ts/', 'dist/esm/ts-4.1');

const stubTs41Types = `
import { EndpointDefinitions } from './endpointDefinitions';
export declare type TS41Hooks<Definitions extends EndpointDefinitions> = unknown;
export {};
`;

fs.writeFileSync('dist/esm/ts/ts41Types.d.ts', stubTs41Types);

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

fs.writeFileSync(
  'dist/react.js',
  `
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react.cjs.production.min.js')
} else {
  module.exports = require('./react.cjs.development.js')
}
`
);
