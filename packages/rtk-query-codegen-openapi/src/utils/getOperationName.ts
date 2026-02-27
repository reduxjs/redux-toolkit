import lodashCamelCase from 'lodash.camelcase';
import { UNSTABLE_cg as cg } from 'oazapfts';

const { isValidIdentifier } = cg;

export function getOperationName(
  verb: string,
  path: string,
  operationId?: string
): string {
  if (operationId) {
    const normalized = operationId.replace(/[^\w\s]/g, ' ');
    let camelCased = lodashCamelCase(normalized);
    if (camelCased) {
      camelCased = camelCased.replace(/^[^a-zA-Z_$]+/, '');
      if (camelCased && isValidIdentifier(camelCased)) {
        return camelCased;
      }
    }
  }
  const pathStr = path
    .replace(/\{(.+?)\}/, 'by $1')
    .replace(/\{(.+?)\}/, 'and $1');
  return lodashCamelCase(`${verb} ${pathStr}`);
}
