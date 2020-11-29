const fs = require('fs');
const glob = require('glob');
const { cp, mkdir, rm } = require('shelljs');

rm('-r', 'dist/min-4.1');
mkdir('-p', 'dist/min-4.1');

const fourOneFiles = glob.sync('dist/*', { nodir: true }).filter((n) => !n.includes('min-4.1') && n.includes('.d.ts'));
console.log(fourOneFiles);

for (let file of fourOneFiles) {
  cp(file, 'dist/min-4.1/');
}

const additionalTypes = `
import { EndpointDefinitions } from './endpointDefinitions';
export declare type TS41Hooks<Definitions extends EndpointDefinitions> = unknown;
export {};
`;

fs.appendFileSync('dist/min-4.1/ts41Types.d.ts', additionalTypes);
