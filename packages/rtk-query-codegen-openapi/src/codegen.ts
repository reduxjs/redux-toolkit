import { factory } from './utils/factory';
import ts from 'typescript';

/**
 * The identifier used for the endpoint builder argument when no other one
 * is supplied, i.e. the `build` in `endpoints: (build) => ({ ... })`.
 *
 * @internal
 */
const defaultEndpointBuilder = factory.createIdentifier('build');

/**
 * A set of object properties to generate, keyed by property name.
 * Properties whose value is `undefined` are skipped, which lets callers
 * pass optional properties without filtering them first.
 *
 * @since 1.0.0
 * @public
 */
export type ObjectPropertyDefinitions = Record<string, ts.Expression | undefined>;

/**
 * Turns a set of property definitions into property assignment nodes,
 * dropping every entry with an `undefined` value.
 *
 * @param obj - The properties to generate.
 * @returns The property assignment nodes for the defined entries.
 *
 * @since 1.0.0
 * @public
 */
export function generateObjectProperties(obj: ObjectPropertyDefinitions) {
  return Object.entries(obj)
    .filter(([_, v]) => v)
    .map(([k, v]) => factory.createPropertyAssignment(factory.createIdentifier(k), v as ts.Expression));
}

/**
 * Generates an import declaration for `pkg`.
 *
 * Each entry of {@linkcode namedImports} maps the exported name to the
 * local name it is bound to; an alias is only emitted when the two differ.
 *
 * @example
 * <caption>Aliasing an export while importing it</caption>
 *
 * ```ts
 * generateImportNode('./api', { myApi: 'api' });
 * // import { myApi as api } from './api';
 * ```
 *
 * @param pkg - The module specifier to import from.
 * @param namedImports - A mapping of exported name to local name.
 * @param [defaultImportName] - The local name to bind the default export to, if any.
 * @returns The import declaration node.
 *
 * @since 1.0.0
 * @public
 */
export function generateImportNode(pkg: string, namedImports: Record<string, string>, defaultImportName?: string) {
  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      false,
      defaultImportName !== undefined ? factory.createIdentifier(defaultImportName) : undefined,
      factory.createNamedImports(
        Object.entries(namedImports).map(([propertyName, name]) =>
          factory.createImportSpecifier(
            name === propertyName ? undefined : factory.createIdentifier(propertyName),
            factory.createIdentifier(name)
          )
        )
      )
    ),
    factory.createStringLiteral(pkg)
  );
}

/**
 * Generates the `const injectedRtkApi = ...` statement that injects the
 * generated endpoints into the imported base api.
 *
 * When {@linkcode tag} is `true` the injection is chained onto an
 * `enhanceEndpoints({ addTagTypes })` call so the generated tag types are
 * registered first.
 *
 * @param params - The endpoint definitions to inject, plus the builder identifier and tag flag.
 * @returns The variable statement declaring the injected api.
 *
 * @since 1.0.0
 * @public
 */
export function generateCreateApiCall({
  endpointBuilder = defaultEndpointBuilder,
  endpointDefinitions,
  tag,
}: {
  /**
   * The identifier bound as the endpoint builder argument.
   *
   * @default build
   */
  endpointBuilder?: ts.Identifier;

  /**
   * The object literal of endpoint definitions to inject.
   */
  endpointDefinitions: ts.ObjectLiteralExpression;

  /**
   * Whether to chain the injection onto an `enhanceEndpoints` call that
   * registers the generated tag types.
   */
  tag: boolean;
}) {
  const injectEndpointsObjectLiteralExpression = factory.createObjectLiteralExpression(
    generateObjectProperties({
      endpoints: factory.createArrowFunction(
        undefined,
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, endpointBuilder, undefined, undefined, undefined)],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createParenthesizedExpression(endpointDefinitions)
      ),
      overrideExisting: factory.createFalse(),
    }),
    true
  );
  if (tag) {
    const enhanceEndpointsObjectLiteralExpression = factory.createObjectLiteralExpression(
      [factory.createShorthandPropertyAssignment(factory.createIdentifier('addTagTypes'), undefined)],
      true
    );
    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            factory.createIdentifier('injectedRtkApi'),
            undefined,
            undefined,
            factory.createCallExpression(
              factory.createPropertyAccessExpression(
                factory.createCallExpression(
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier('api'),
                    factory.createIdentifier('enhanceEndpoints')
                  ),
                  undefined,
                  [enhanceEndpointsObjectLiteralExpression]
                ),
                factory.createIdentifier('injectEndpoints')
              ),
              undefined,
              [injectEndpointsObjectLiteralExpression]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    );
  }

  return factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createIdentifier('injectedRtkApi'),
          undefined,
          undefined,
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier('api'),
              factory.createIdentifier('injectEndpoints')
            ),
            undefined,
            [injectEndpointsObjectLiteralExpression]
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/**
 * Generates a single endpoint definition, i.e. one
 * `name: build.query<Response, QueryArg>({ ... })` property.
 *
 * {@linkcode tags} are only emitted for the side that matches
 * {@linkcode type} - `providesTags` for a query, `invalidatesTags` for a
 * mutation - unless {@linkcode tagOverrides} supplies that key, in which
 * case the override wins for both kinds of endpoint. An override present
 * but set to an empty array therefore emits an empty array rather than
 * falling back to {@linkcode tags}.
 *
 * @param params - The endpoint name, kind, types, query function, and tag configuration.
 * @returns The property assignment defining the endpoint.
 *
 * @since 1.0.0
 * @public
 */
export function generateEndpointDefinition({
  operationName,
  type,
  Response,
  QueryArg,
  queryFn,
  endpointBuilder = defaultEndpointBuilder,
  extraEndpointsProps,
  tags,
  tagOverrides,
}: {
  /**
   * The name of the generated endpoint.
   */
  operationName: string;

  /**
   * Whether the endpoint is a query or a mutation.
   */
  type: 'query' | 'mutation';

  /**
   * A reference to the generated response type.
   */
  Response: ts.TypeReferenceNode;

  /**
   * A reference to the generated query argument type.
   */
  QueryArg: ts.TypeReferenceNode;

  /**
   * The arrow function building the request for this endpoint.
   */
  queryFn: ts.Expression;

  /**
   * The identifier bound as the endpoint builder argument.
   *
   * @default build
   */
  endpointBuilder?: ts.Identifier;

  /**
   * Extra properties to add to the endpoint definition object.
   */
  extraEndpointsProps: ObjectPropertyDefinitions;

  /**
   * The tags read off the operation, applied according to
   * {@linkcode type}.
   */
  tags?: string[];

  /**
   * Explicit tag declarations that take precedence over
   * {@linkcode tags}.
   */
  tagOverrides?: { providesTags?: string[]; invalidatesTags?: string[] };
}) {
  const objectProperties = generateObjectProperties({ query: queryFn, ...extraEndpointsProps });
  const providesTags =
    tagOverrides && 'providesTags' in tagOverrides
      ? tagOverrides.providesTags
      : type === 'query'
        ? tags
        : undefined;
  const invalidatesTags =
    tagOverrides && 'invalidatesTags' in tagOverrides
      ? tagOverrides.invalidatesTags
      : type === 'mutation'
        ? tags
        : undefined;

  if (providesTags !== undefined) {
    objectProperties.push(
      factory.createPropertyAssignment(
        factory.createIdentifier('providesTags'),
        factory.createArrayLiteralExpression(providesTags.map((tag) => factory.createStringLiteral(tag)), false)
      )
    );
  }

  if (invalidatesTags !== undefined) {
    objectProperties.push(
      factory.createPropertyAssignment(
        factory.createIdentifier('invalidatesTags'),
        factory.createArrayLiteralExpression(invalidatesTags.map((tag) => factory.createStringLiteral(tag)), false)
      )
    );
  }
  return factory.createPropertyAssignment(
    factory.createIdentifier(operationName),

    factory.createCallExpression(
      factory.createPropertyAccessExpression(endpointBuilder, factory.createIdentifier(type)),
      [Response, QueryArg],
      [factory.createObjectLiteralExpression(objectProperties, true)]
    )
  );
}

/**
 * Generates the exported `addTagTypes` constant holding every tag type
 * found across the operations.
 *
 * @example
 * <caption>The generated statement</caption>
 *
 * ```ts
 * export const addTagTypes = ['Pet', 'Store'] as const;
 * ```
 *
 * @param params - The tag types to declare.
 * @returns The variable statement declaring the tag types.
 *
 * @since 1.0.0
 * @public
 */
export function generateTagTypes({
  addTagTypes,
}: {
  /**
   * Every tag type to declare.
   */
  addTagTypes: string[];
}) {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createIdentifier('addTagTypes'),
          undefined,
          undefined,
          factory.createAsExpression(
            factory.createArrayLiteralExpression(
              addTagTypes.map((tagType) => factory.createStringLiteral(tagType)),
              true
            ),
            factory.createTypeReferenceNode(factory.createIdentifier('const'), undefined)
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}
