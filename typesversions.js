const fs = require('fs');
const glob = require('glob');
const { cp, mkdir, rm } = require('shelljs');

rm('-r', 'dist/min-4.1');
mkdir('-p', 'dist/min-4.1');

const fourOneFiles = glob.sync('dist/*.d.ts');
fourOneFiles.push('dist/utils');
fourOneFiles.push('dist/core');
fourOneFiles.push('dist/react-hooks');

for (let file of fourOneFiles) {
  cp('-r', file, 'dist/min-4.1/');
}

const stubTs41Types = `
import { EndpointDefinitions } from './endpointDefinitions';
export declare type TS41Hooks<Definitions extends EndpointDefinitions> = unknown;
export {};
`;

fs.writeFileSync('dist/ts41Types.d.ts', stubTs41Types);
