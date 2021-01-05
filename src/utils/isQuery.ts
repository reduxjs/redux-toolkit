import { operationKeys } from '../types';

export function isQuery(verb: typeof operationKeys[number]) {
  return verb === 'get';
}
