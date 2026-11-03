import type { OpenAPIV3 } from 'openapi-types';
import type { OperationDefinition } from '../types';
import { operationKeys } from '../types';

/**
 * Flattens an OpenAPI document into one
 * {@linkcode OperationDefinition} per path and HTTP verb.
 *
 * Keys of a path item that are not among
 * {@linkcode operationKeys} - such as `parameters` or `summary` - are
 * skipped, as are paths with no path item.
 *
 * @param v3Doc - The OpenAPI v3 document to read operations from.
 * @returns Every operation in the document, in the order the paths and verbs are declared.
 *
 * @since 1.0.0
 * @public
 */
export function getOperationDefinitions(v3Doc: OpenAPIV3.Document): OperationDefinition[] {
  return Object.entries(v3Doc.paths).flatMap(([path, pathItem]) =>
    !pathItem
      ? []
      : Object.entries(pathItem)
          .filter((arg): arg is [(typeof operationKeys)[number], OpenAPIV3.OperationObject] =>
            operationKeys.includes(arg[0] as any)
          )
          .map(([verb, operation]) => ({
            path,
            verb,
            pathItem,
            operation,
          }))
  );
}
