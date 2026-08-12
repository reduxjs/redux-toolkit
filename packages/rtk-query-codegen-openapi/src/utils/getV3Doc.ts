import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
// @ts-ignore
import converter from 'swagger2openapi';

/**
 * Loads an API schema and returns it as an OpenAPI v3 document.
 *
 * The schema is bundled with {@linkcode SwaggerParser.bundle()}, which
 * follows and inlines external references. A Swagger 2.0 document is then
 * converted up to OpenAPI 3 with `swagger2openapi`, so callers always get
 * a v3 document back.
 *
 * @param spec - The path or URL of the schema to load.
 * @param [httpResolverOptions] - Options for resolving references fetched over HTTP.
 * @returns A {@linkcode Promise | promise} resolving to the OpenAPI v3 document.
 * @throws An {@linkcode Error} if the schema cannot be read, parsed, or converted.
 *
 * @since 1.0.0
 * @public
 */
export async function getV3Doc(
  spec: string,
  httpResolverOptions?: SwaggerParser.HTTPResolverOptions
): Promise<OpenAPIV3.Document> {
  const doc = await SwaggerParser.bundle(spec, {
    resolve: {
      http: httpResolverOptions,
    },
  });

  const isOpenApiV3 = 'openapi' in doc && doc.openapi.startsWith('3');

  if (isOpenApiV3) {
    return doc as OpenAPIV3.Document;
  } else {
    const result = await converter.convertObj(doc, {});
    return result.openapi as OpenAPIV3.Document;
  }
}
