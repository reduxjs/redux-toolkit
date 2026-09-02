import type { EndpointOverrides, operationKeys } from '../types';

/**
 * Decides whether an operation should be generated as a query rather than
 * a mutation.
 *
 * An explicit {@linkcode EndpointOverrides.type | type} override always
 * wins; otherwise only `get` operations are treated as queries.
 *
 * @param verb - The HTTP verb of the operation.
 * @param overrides - The override matching the operation, if any.
 * @returns `true` if the operation should be a query, `false` if it should be a mutation.
 *
 * @since 1.0.0
 * @public
 */
export function isQuery(verb: (typeof operationKeys)[number], overrides: EndpointOverrides | undefined) {
  if (overrides?.type) {
    return overrides.type === 'query';
  }
  return verb === 'get';
}
