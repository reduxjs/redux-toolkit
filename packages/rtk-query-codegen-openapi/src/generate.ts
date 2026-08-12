import { getReferenceName, isReference, resolve, resolveArray } from '@oazapfts/resolve';
import camelCase from 'lodash.camelcase';
import path from 'node:path';
import { UNSTABLE_cg as cg } from 'oazapfts';
import type { OazapftsContext } from 'oazapfts/context';
import { createContext, withMode } from 'oazapfts/context';
import {
  getOperationName,
  getResponseType,
  getSchemaFromContent,
  getTypeFromResponse,
  getTypeFromSchema,
  preprocessComponents,
} from 'oazapfts/generate';
import type { OpenAPIV3 } from 'openapi-types';
import ts from 'typescript';
import type { ObjectPropertyDefinitions } from './codegen';
import { generateCreateApiCall, generateEndpointDefinition, generateImportNode, generateTagTypes } from './codegen';
import { generateReactHooks } from './generators/react-hooks';
import type {
  EndpointMatcher,
  EndpointOverrides,
  GenerationOptions,
  OperationDefinition,
  OperationIdTransformer,
  ParameterDefinition,
  ParameterMatcher,
  TextMatcher,
} from './types';
import { factory } from './utils/factory';
import { capitalize, getOperationDefinitions, getV3Doc, removeUndefined, isQuery as testIsQuery } from './utils/index';

const { createPropertyAssignment, createQuestionToken, keywordType, isValidIdentifier } = cg;

/**
 * The identifier of the internal const the endpoints are injected into.
 * It is re-exported under the user-facing `exportName`.
 *
 * @internal
 */
const generatedApiName = 'injectedRtkApi';

/**
 * Resolved OpenAPI documents, keyed by the spec path or URL they were
 * loaded from, so generating several output files from one spec only
 * fetches and dereferences it once.
 *
 * @internal
 */
const v3DocCache: Record<string, OpenAPIV3.Document> = {};

/**
 * Merges bracketed parameters such as `filter[name]` and `filter[age]`
 * into a single `deepObject` parameter whose schema carries one property
 * per bracketed key. Parameters without brackets are passed through
 * untouched.
 *
 * @param params - The parameters to merge.
 * @returns The parameters, with bracketed ones merged into `deepObject` parameters.
 *
 * @internal
 */
function supportDeepObjects(params: OpenAPIV3.ParameterObject[]): OpenAPIV3.ParameterObject[] {
  const res: OpenAPIV3.ParameterObject[] = [];
  const merged: Record<string, any> = {};
  for (const p of params) {
    const m = /^(.+?)\[(.*?)\]/.exec(p.name);
    if (!m) {
      res.push(p);
      continue;
    }
    const [, name, prop] = m;
    let obj = merged[name];
    if (!obj) {
      obj = merged[name] = {
        name,
        in: p.in,
        style: 'deepObject',
        schema: {
          type: 'object',
          properties: {} as Record<string, any>,
        },
      };
      res.push(obj);
    }
    obj.schema.properties[prop] = p.schema;
  }
  return res;
}

/**
 * The default {@linkcode GenerationOptions.isDataResponse | isDataResponse}
 * check: a response counts as data when its status code is in the `2xx`
 * range, or when it is the `default` response and
 * {@linkcode includeDefault} is `true`.
 *
 * @param code - The HTTP status code as a string.
 * @param includeDefault - Whether the `default` response counts as a data response.
 * @returns `true` if the response is a data response, `false` otherwise.
 *
 * @internal
 */
function defaultIsDataResponse(code: string, includeDefault: boolean) {
  if (includeDefault && code === 'default') {
    return true;
  }
  const parsedCode = Number(code);
  return !Number.isNaN(parsedCode) && parsedCode >= 200 && parsedCode < 300;
}

/**
 * Resolves the generated endpoint name for an operation by applying the
 * configured {@linkcode OperationIdTransformer}.
 *
 * - `"camelCase"` *(default)* - delegates to `oazapfts` {@linkcode getOperationName()}, which applies lodash {@linkcode camelCase()} and falls back to a verb+path derived name when `operationId` is absent.
 * - `"none"` - returns `operationId` verbatim.
 * - `(operationId: string) => string` - calls the provided function with `operationId`.
 *
 * For `"none"` and function transformers, a missing `operationId` throws an
 * {@linkcode Error} with the offending HTTP method and path in the message.
 *
 * @param operationDefinition - The operation to resolve a name for.
 * @param [operationIdTransformer="camelCase"] - How to transform the `operationId`.
 * @returns The resolved endpoint name string.
 * @throws An {@linkcode Error} when `operationId` is `undefined` and the transformer is not `"camelCase"`.
 *
 * @since 2.3.0
 * @public
 */
export function resolveOperationName(
  operationDefinition: Pick<OperationDefinition, 'verb' | 'path' | 'operation'>,
  operationIdTransformer: OperationIdTransformer = 'camelCase'
): string {
  const { verb, path, operation } = operationDefinition;

  if (operationIdTransformer === 'camelCase') {
    return getOperationName(verb, path, operation.operationId);
  }

  if (operation.operationId === undefined) {
    throw new Error(
      `operationIdTransformer: "${typeof operationIdTransformer === 'function' ? 'function' : operationIdTransformer}" requires all operations to have an operationId, but found a missing operationId at ${verb.toUpperCase()} ${path}`
    );
  }

  if (operationIdTransformer === 'none') {
    return operation.operationId;
  }

  return operationIdTransformer(operation.operationId);
}

/**
 * Reads the OpenAPI `tags` declared on one operation of a path item.
 *
 * @param operationDefinition - The verb and path item to read tags from.
 * @returns The tags declared on the operation, or an empty array if it declares none.
 *
 * @internal
 */
function getTags({ verb, pathItem }: Pick<OperationDefinition, 'verb' | 'pathItem'>): string[] {
  return verb ? pathItem[verb]?.tags || [] : [];
}

/**
 * Builds a predicate that tests a name against a
 * {@linkcode TextMatcher}. A `string` entry must match exactly, a
 * {@linkcode RegExp} entry must test true, and an array matches if any of
 * its entries does.
 *
 * An `undefined` pattern matches everything, so an absent filter is a
 * no-op rather than a reject-all.
 *
 * @param [pattern] - The pattern to match against, or `undefined` to match everything.
 * @returns A predicate taking the name to test.
 *
 * @internal
 */
function patternMatches(pattern?: TextMatcher) {
  const filters = Array.isArray(pattern) ? pattern : [pattern];
  return function matcher(operationName: string) {
    if (!pattern) return true;
    return filters.some((filter) =>
      typeof filter === 'string' ? filter === operationName : filter?.test(operationName)
    );
  };
}

/**
 * Builds a predicate that tests an operation against an
 * {@linkcode EndpointMatcher}, resolving the operation's generated name
 * first so the pattern is matched against the same name the endpoint will
 * be given.
 *
 * An `undefined` pattern matches every operation.
 *
 * @param [pattern] - The matcher to test against, or `undefined` to match everything.
 * @param [operationIdTransformer="camelCase"] - How to resolve each operation's name before matching.
 * @returns A predicate taking the {@linkcode OperationDefinition} to test.
 *
 * @internal
 */
function operationMatches(pattern?: EndpointMatcher, operationIdTransformer: OperationIdTransformer = 'camelCase') {
  const checkMatch = typeof pattern === 'function' ? pattern : patternMatches(pattern);
  return function matcher(operationDefinition: OperationDefinition) {
    if (!pattern) return true;
    const operationName = resolveOperationName(operationDefinition, operationIdTransformer);
    return checkMatch(operationName, operationDefinition);
  };
}

/**
 * Builds a predicate that tests a parameter against a
 * {@linkcode ParameterMatcher}.
 *
 * Path parameters always match regardless of the pattern, since removing
 * one would leave a hole in the generated url.
 *
 * @param [pattern] - The matcher to test against, or `undefined` to match everything.
 * @returns A predicate taking the {@linkcode ParameterDefinition} to test.
 *
 * @internal
 */
function argumentMatches(pattern?: ParameterMatcher) {
  const checkMatch = typeof pattern === 'function' ? pattern : patternMatches(pattern);
  return function matcher(argumentDefinition: ParameterDefinition) {
    if (!pattern || argumentDefinition.in === 'path') return true;
    const argumentName = argumentDefinition.name;
    return checkMatch(argumentName, argumentDefinition);
  };
}

/**
 * Attaches the OpenAPI description of a query argument to a node as a
 * leading JSDoc comment, so the generated types carry the spec's own
 * documentation. Returns the node unchanged when there is no description.
 *
 * @template T - The type of node being annotated.
 * @param node - The node to attach the comment to.
 * @param def - The query argument whose description is used.
 * @param hasTrailingNewLine - Whether to emit a newline after the comment.
 * @returns The node, with the comment attached when one was available.
 *
 * @internal
 */
function withQueryComment<T extends ts.Node>(node: T, def: QueryArgDefinition, hasTrailingNewLine: boolean): T {
  const comment = def.origin === 'param' ? def.param.description : def.body.description;
  if (comment) {
    return ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      `* ${comment} `,
      hasTrailingNewLine
    );
  }
  return node;
}

/**
 * Reads the non-empty `pattern` keyword off a string schema property,
 * resolving the property first if it is a reference.
 *
 * @param property - The schema property to read the pattern from.
 * @param ctx - The `oazapfts` context used to resolve references.
 * @returns The pattern, or `null` if the property is not a string schema or declares no non-empty pattern.
 *
 * @internal
 */
function getPatternFromProperty(
  property: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ctx: OazapftsContext
): string | null {
  const resolved = resolve(property, ctx);
  if (!resolved || typeof resolved !== 'object' || !('pattern' in resolved)) return null;
  if (resolved.type !== 'string') return null;
  const pattern = resolved.pattern;
  return typeof pattern === 'string' && pattern.length > 0 ? pattern : null;
}

/**
 * Generates one exported regex constant per string property of a schema
 * that declares a `pattern`, named `<typeName><PropertyName>Pattern` in
 * camelCase. Forward slashes in the pattern are escaped so the emitted
 * regex literal stays valid.
 *
 * @example
 * <caption>The generated constant</caption>
 *
 * ```ts
 * export const petNamePattern = /^[a-z]+$/;
 * ```
 *
 * @param typeName - The name of the type the schema describes.
 * @param schema - The schema whose properties are scanned for patterns.
 * @param ctx - The `oazapfts` context used to resolve references.
 * @returns One variable statement per property declaring a pattern, or an empty array if there are none.
 *
 * @internal
 */
function generateRegexConstantsForType(
  typeName: string,
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ctx: OazapftsContext
): ts.VariableStatement[] {
  const resolvedSchema = resolve(schema, ctx);
  if (!resolvedSchema || !('properties' in resolvedSchema) || !resolvedSchema.properties) return [];

  const constants: ts.VariableStatement[] = [];

  for (const [propertyName, property] of Object.entries(resolvedSchema.properties)) {
    const pattern = getPatternFromProperty(property, ctx);
    if (!pattern) continue;

    const constantName = camelCase(`${typeName} ${propertyName} Pattern`);
    const escapedPattern = pattern.replaceAll('/', String.raw`\/`);
    const regexLiteral = factory.createRegularExpressionLiteral(`/${escapedPattern}/`);

    constants.push(
      factory.createVariableStatement(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              factory.createIdentifier(constantName),
              undefined,
              undefined,
              regexLiteral
            ),
          ],
          ts.NodeFlags.Const
        )
      )
    );
  }

  return constants;
}

/**
 * Finds the first {@linkcode EndpointOverrides} whose
 * {@linkcode EndpointOverrides.pattern | pattern} matches an operation.
 * Only the first match applies, so earlier entries win over later ones.
 *
 * @param operation - The operation to find an override for.
 * @param [endpointOverrides] - The overrides to search.
 * @param [operationIdTransformer="camelCase"] - How to resolve the operation's name before matching.
 * @returns The matching override, or `undefined` if none matches.
 *
 * @since 1.0.0
 * @public
 */
export function getOverrides(
  operation: OperationDefinition,
  endpointOverrides?: EndpointOverrides[],
  operationIdTransformer: OperationIdTransformer = 'camelCase'
): EndpointOverrides | undefined {
  return endpointOverrides?.find((override) => operationMatches(override.pattern, operationIdTransformer)(operation));
}

/**
 * Generates the source code of an RTK Query api from an OpenAPI schema.
 *
 * The returned code is printed but not formatted - callers are expected to
 * run it through Prettier.
 *
 * @param spec - The path or URL of the OpenAPI schema to generate from.
 * @param options - The generation options.
 * @returns A {@linkcode Promise | promise} resolving to the generated source code.
 * @throws An {@linkcode Error} if the schema cannot be loaded, if two generated types collide on a name, or if a path references a parameter it does not declare.
 *
 * @since 1.0.0
 * @public
 */
export async function generateApi(
  spec: string,
  {
    apiFile,
    apiImport = 'api',
    exportName = 'enhancedApi',
    argSuffix = 'ApiArg',
    responseSuffix = 'ApiResponse',
    operationNameSuffix = '',
    hooks = false,
    tag = false,
    outputFile,
    isDataResponse = defaultIsDataResponse,
    filterEndpoints,
    endpointOverrides,
    unionUndefined,
    encodePathParams = false,
    encodeQueryParams = false,
    flattenArg = false,
    includeDefault = false,
    useEnumType = false,
    enumStyle,
    mergeReadWriteOnly = false,
    httpResolverOptions,
    useUnknown = false,
    esmExtensions = false,
    outputRegexConstants = false,
    operationIdTransformer = 'camelCase',
    exportAllSchemas = false,
  }: GenerationOptions
) {
  const v3Doc = (v3DocCache[spec] ??= await getV3Doc(spec, httpResolverOptions));

  const ctx = createContext(v3Doc, {
    unionUndefined,
    useEnumType,
    enumStyle,
    mergeReadWriteOnly,
    useUnknown,
  });
  preprocessComponents(ctx);

  const operationDefinitions = getOperationDefinitions(v3Doc).filter(
    operationMatches(filterEndpoints, operationIdTransformer)
  );

  const resultFile = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  /**
   * The response and argument types generated so far, keyed by name.
   *
   * @internal
   */
  const interfaces: Record<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration> = {};

  /**
   * Records a generated type so it can be emitted with the rest, rejecting
   * duplicate names rather than silently overwriting the first one.
   *
   * @param declaration - The type to register.
   * @returns The declaration that was passed in, so the call can be inlined.
   * @throws An {@linkcode Error} if a type of the same name is already registered.
   *
   * @internal
   */
  function registerInterface(declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration) {
    const name = declaration.name.escapedText.toString();
    if (name in interfaces) {
      throw new Error(`interface/type alias ${name} already registered`);
    }
    interfaces[name] = declaration;
    return declaration;
  }

  if (outputFile) {
    outputFile = path.resolve(process.cwd(), outputFile);
    if (apiFile.startsWith('.')) {
      apiFile = path.relative(path.dirname(outputFile), apiFile);
      apiFile = apiFile.replace(/\\/g, '/');
      if (!apiFile.startsWith('.')) apiFile = `./${apiFile}`;
    }
  }

  if (esmExtensions === true) {
    // Convert TS/JSX extensions to their JS equivalents
    apiFile = apiFile
      .replace(/\.mts$/, '.mjs')
      .replace(/\.[jt]sx$/, '.jsx')
      .replace(/\.ts$/, '.js');
  } else {
    // Remove all extensions
    apiFile = apiFile.replace(/\.[jt]sx?$/, '');
  }

  return printer.printNode(
    ts.EmitHint.Unspecified,
    factory.createSourceFile(
      [
        generateImportNode(apiFile, { [apiImport]: 'api' }),
        ...(tag ? [generateTagTypes({ addTagTypes: extractAllTagTypes({ operationDefinitions }) })] : []),
        generateCreateApiCall({
          tag,
          endpointDefinitions: factory.createObjectLiteralExpression(
            operationDefinitions.map((operationDefinition) =>
              generateEndpoint({
                operationDefinition,
                overrides: getOverrides(operationDefinition, endpointOverrides, operationIdTransformer),
              })
            ),
            true
          ),
        }),
        factory.createExportDeclaration(
          undefined,
          false,
          factory.createNamedExports([
            factory.createExportSpecifier(
              factory.createIdentifier(generatedApiName),
              factory.createIdentifier(exportName)
            ),
          ]),
          undefined
        ),
        ...Object.values(interfaces),
        ...(outputRegexConstants
          ? ctx.aliases.flatMap((alias) => {
              if (!ts.isInterfaceDeclaration(alias) && !ts.isTypeAliasDeclaration(alias)) return [alias];

              const typeName = alias.name.escapedText.toString();
              const schema = v3Doc.components?.schemas?.[typeName];
              if (!schema) return [alias];

              const regexConstants = generateRegexConstantsForType(typeName, schema, ctx);
              return regexConstants.length > 0 ? [alias, ...regexConstants] : [alias];
            })
          : ctx.aliases),
        ...(exportAllSchemas && v3Doc.components?.schemas ? generateAllSchemaTypes(v3Doc.components.schemas, ctx) : []),
        ...ctx.enumAliases,
        ...(hooks
          ? [
              generateReactHooks({
                exportName: generatedApiName,
                operationDefinitions,
                endpointOverrides,
                config: hooks,
                operationNameSuffix,
                operationIdTransformer,
              }),
            ]
          : []),
      ],
      factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    ),
    resultFile
  );

  /**
   * Collects the distinct tags declared across every operation, preserving
   * the order in which they are first seen.
   *
   * @param params - The operations to collect tags from.
   * @returns Every distinct tag declared across the operations.
   *
   * @internal
   */
  function extractAllTagTypes({ operationDefinitions }: { operationDefinitions: OperationDefinition[] }) {
    const allTagTypes = new Set<string>();

    for (const operationDefinition of operationDefinitions) {
      const { verb, pathItem } = operationDefinition;
      for (const tag of getTags({ verb, pathItem })) {
        allTagTypes.add(tag);
      }
    }
    return [...allTagTypes];
  }

  /**
   * Generates one endpoint definition, registering its response and
   * argument types along the way.
   *
   * @param params - The operation to generate, plus the override matching it.
   * @returns The property assignment defining the endpoint.
   *
   * @internal
   */
  function generateEndpoint({
    operationDefinition,
    overrides,
  }: {
    /**
     * The operation to generate an endpoint for.
     */
    operationDefinition: OperationDefinition;

    /**
     * The override matching the operation, if any.
     */
    overrides?: EndpointOverrides;
  }) {
    const {
      verb,
      path,
      pathItem,
      operation,
      operation: { responses, requestBody },
    } = operationDefinition;
    const operationName = resolveOperationName({ verb, path, operation }, operationIdTransformer);
    const tags = tag ? getTags({ verb, pathItem }) : undefined;
    const isQuery = testIsQuery(verb, overrides);

    const returnsJson = getResponseType(ctx, responses) === 'json';
    let ResponseType: ts.TypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    if (returnsJson) {
      const returnTypes = Object.entries(responses || {})
        .map(
          ([code, response]) =>
            [
              code,
              resolve(response, ctx),
              getTypeFromResponse(response, withMode(ctx, 'readOnly')) ||
                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ] as const
        )
        .filter(([status, response]) => isDataResponse(status, includeDefault, resolve(response, ctx), responses || {}))
        .filter(([_1, _2, type]) => type !== keywordType.void)
        .map(([code, response, type]) =>
          ts.addSyntheticLeadingComment(
            { ...type },
            ts.SyntaxKind.MultiLineCommentTrivia,
            `* status ${code} ${response.description} `,
            false
          )
        );
      if (returnTypes.length > 0) {
        ResponseType = factory.createUnionTypeNode(returnTypes);
      }
    }

    const ResponseTypeName = factory.createTypeReferenceNode(
      registerInterface(
        factory.createTypeAliasDeclaration(
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          capitalize(operationName + operationNameSuffix + responseSuffix),
          undefined,
          ResponseType
        )
      ).name
    );

    const operationParameters = resolveArray(ctx, operation.parameters);
    const pathItemParameters = resolveArray(ctx, pathItem.parameters).filter(
      (pp) => !operationParameters.some((op) => op.name === pp.name && op.in === pp.in)
    );

    const parameters = supportDeepObjects([...pathItemParameters, ...operationParameters]).filter(
      argumentMatches(overrides?.parameterFilter)
    );

    const allNames = parameters.map((p) => p.name);
    const queryArg: QueryArgDefinitions = {};

    /**
     * Derives a collision-free property name for a query argument.
     *
     * Names are disambiguated in three steps: a name shared by several
     * parameters is prefixed with where it came from, a pure snake_case
     * name is camelCased unless that would collide, and anything still
     * taken is prefixed with underscores until it is free.
     *
     * @param name - The parameter's name as written in the schema.
     * @param potentialPrefix - Where the parameter came from, used as the prefix on a conflict.
     * @returns A name not yet used by another query argument.
     *
     * @internal
     */
    function generateName(name: string, potentialPrefix: string) {
      const isPureSnakeCase = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
      // prefix with `query`, `path` or `body` if there are multiple parameters with the same name
      const hasNamingConflict = allNames.filter((n) => n === name).length > 1;
      if (hasNamingConflict) {
        name = `${potentialPrefix}_${name}`;
      }
      // convert to camelCase if the name is pure snake_case and there are no naming conflicts
      const camelCaseName = camelCase(name);
      if (isPureSnakeCase && !allNames.includes(camelCaseName)) {
        name = camelCaseName;
      }
      // if there are still any naming conflicts, prepend with underscore
      while (name in queryArg) {
        name = `_${name}`;
      }
      return name;
    }

    for (const param of parameters) {
      const name = generateName(param.name, param.in);
      queryArg[name] = {
        origin: 'param',
        name,
        originalName: param.name,
        type: getTypeFromSchema(withMode(ctx, 'writeOnly'), isReference(param) ? param : param.schema),
        required: param.required,
        param,
      };
    }

    if (requestBody) {
      const body = resolve(requestBody, ctx);
      const schema = getSchemaFromContent(body.content);
      const type = getTypeFromSchema(ctx, schema);
      const schemaName = camelCase(
        (type as any).name ||
          getReferenceName(schema) ||
          (typeof schema === 'object' && 'title' in schema && schema.title) ||
          'body'
      );
      const name = generateName(schemaName in queryArg ? 'body' : schemaName, 'body');

      queryArg[name] = {
        origin: 'body',
        name,
        originalName: schemaName,
        type: getTypeFromSchema(withMode(ctx, 'writeOnly'), schema),
        // A request body is optional unless the spec explicitly marks it required (OpenAPI defaults `required` to `false`).
        required: body.required ?? false,
        body,
      };
    }

    /**
     * Renders a query argument name as a property name, quoting it when it
     * is not a valid identifier.
     *
     * @param name - The name to render.
     * @returns The property name node.
     *
     * @internal
     */
    const propertyName = (name: string | ts.PropertyName): ts.PropertyName => {
      if (typeof name === 'string') {
        return isValidIdentifier(name) ? factory.createIdentifier(name) : factory.createStringLiteral(name);
      }
      return name;
    };

    const queryArgValues = Object.values(queryArg);

    const isFlatArg = flattenArg && queryArgValues.length === 1;
    const QueryArg = factory.createTypeReferenceNode(
      registerInterface(
        factory.createTypeAliasDeclaration(
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          capitalize(operationName + operationNameSuffix + argSuffix),
          undefined,
          queryArgValues.length > 0
            ? isFlatArg
              ? withQueryComment(
                  factory.createUnionTypeNode([
                    queryArgValues[0].type,
                    ...(!queryArgValues[0].required
                      ? [factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)]
                      : []),
                  ]),
                  queryArgValues[0],
                  false
                )
              : factory.createTypeLiteralNode(
                  queryArgValues.map((def) =>
                    withQueryComment(
                      factory.createPropertySignature(
                        undefined,
                        propertyName(def.name),
                        createQuestionToken(!def.required),
                        def.type
                      ),
                      def,
                      true
                    )
                  )
                )
            : factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
        )
      ).name
    );

    const tagOverrides =
      overrides && (overrides.providesTags !== undefined || overrides.invalidatesTags !== undefined)
        ? {
            ...(overrides.providesTags !== undefined ? { providesTags: overrides.providesTags } : {}),
            ...(overrides.invalidatesTags !== undefined ? { invalidatesTags: overrides.invalidatesTags } : {}),
          }
        : undefined;

    return generateEndpointDefinition({
      operationName: operationNameSuffix ? capitalize(operationName + operationNameSuffix) : operationName,
      type: isQuery ? 'query' : 'mutation',
      Response: ResponseTypeName,
      QueryArg,
      queryFn: generateQueryFn({
        operationDefinition,
        queryArg,
        isQuery,
        isFlatArg,
        encodePathParams,
        encodeQueryParams,
      }),
      extraEndpointsProps: isQuery
        ? generateQueryEndpointProps({ operationDefinition })
        : generateMutationEndpointProps({ operationDefinition }),
      tags,
      tagOverrides,
    });
  }

  /**
   * Generates the arrow function that builds the request for an endpoint,
   * i.e. the `query` property of an endpoint definition.
   *
   * The `method` property is omitted for `GET` queries, since that is RTK
   * Query's default, and the whole argument is omitted when the operation
   * takes no arguments at all.
   *
   * @param params - The operation, its query arguments, and the encoding flags.
   * @returns The arrow function building the request.
   *
   * @internal
   */
  function generateQueryFn({
    operationDefinition,
    queryArg,
    isFlatArg,
    isQuery,
    encodePathParams,
    encodeQueryParams,
  }: {
    /**
     * The operation to build the request for.
     */
    operationDefinition: OperationDefinition;

    /**
     * The resolved query arguments, keyed by their generated name.
     */
    queryArg: QueryArgDefinitions;

    /**
     * Whether the single query argument is passed directly rather than
     * wrapped in an object.
     */
    isFlatArg: boolean;

    /**
     * Whether the endpoint is a query rather than a mutation.
     */
    isQuery: boolean;

    /**
     * Whether to wrap path parameters in `encodeURIComponent`.
     */
    encodePathParams: boolean;

    /**
     * Whether to wrap query parameters in `encodeURIComponent`.
     */
    encodeQueryParams: boolean;
  }) {
    const { path, verb } = operationDefinition;

    const bodyParameter = Object.values(queryArg).find((def) => def.origin === 'body');

    const rootObject = factory.createIdentifier('queryArg');

    /**
     * Selects the query arguments that came from parameters in a given
     * location.
     *
     * @param paramIn - The OpenAPI parameter location to select, e.g. `query` or `header`.
     * @returns The query arguments declared in that location.
     *
     * @internal
     */
    function pickParams(paramIn: string) {
      return Object.values(queryArg).filter((def) => def.origin === 'param' && def.param.in === paramIn);
    }

    /**
     * Builds one property of the request object - `params`, `headers` or
     * `cookies` - from a group of parameters, keyed by each parameter's
     * original schema name rather than its generated one.
     *
     * @param parameters - The parameters to include.
     * @param propertyName - The name of the request property to build.
     * @returns The property assignment, or `undefined` if there are no parameters to include.
     *
     * @internal
     */
    function createObjectLiteralProperty(parameters: QueryArgDefinition[], propertyName: string) {
      if (parameters.length === 0) return undefined;

      const properties = parameters.map((param) => {
        const value = isFlatArg ? rootObject : accessProperty(rootObject, param.name);

        const encodedValue =
          encodeQueryParams && param.param?.in === 'query'
            ? factory.createConditionalExpression(
                factory.createBinaryExpression(value, ts.SyntaxKind.ExclamationEqualsToken, factory.createNull()),
                undefined,
                factory.createCallExpression(factory.createIdentifier('encodeURIComponent'), undefined, [
                  factory.createCallExpression(factory.createIdentifier('String'), undefined, [value]),
                ]),
                undefined,
                factory.createIdentifier('undefined')
              )
            : value;

        return createPropertyAssignment(param.originalName, encodedValue);
      });

      return factory.createPropertyAssignment(
        factory.createIdentifier(propertyName),
        factory.createObjectLiteralExpression(properties, true)
      );
    }

    return factory.createArrowFunction(
      undefined,
      undefined,
      Object.keys(queryArg).length
        ? [factory.createParameterDeclaration(undefined, undefined, rootObject, undefined, undefined, undefined)]
        : [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createParenthesizedExpression(
        factory.createObjectLiteralExpression(
          [
            factory.createPropertyAssignment(
              factory.createIdentifier('url'),
              generatePathExpression(path, pickParams('path'), rootObject, isFlatArg, encodePathParams)
            ),
            isQuery && verb.toUpperCase() === 'GET'
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('method'),
                  factory.createStringLiteral(verb.toUpperCase())
                ),
            bodyParameter === undefined
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('body'),
                  isFlatArg
                    ? rootObject
                    : factory.createPropertyAccessExpression(rootObject, factory.createIdentifier(bodyParameter.name))
                ),
            createObjectLiteralProperty(pickParams('cookie'), 'cookies'),
            createObjectLiteralProperty(pickParams('header'), 'headers'),
            createObjectLiteralProperty(pickParams('query'), 'params'),
          ].filter(removeUndefined),
          false
        )
      )
    );
  }

  /**
   * Generates a type for every schema in the document that was not
   * already emitted while generating the endpoints, so schemas no endpoint
   * references are still exported.
   *
   * @param schemas - Every schema declared in the document.
   * @param ctx - The `oazapfts` context holding the types generated so far.
   * @returns One type alias per schema not already generated.
   *
   * @internal
   */
  function generateAllSchemaTypes(
    schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
    ctx: OazapftsContext
  ): (ts.InterfaceDeclaration | ts.TypeAliasDeclaration)[] {
    const types: (ts.InterfaceDeclaration | ts.TypeAliasDeclaration)[] = [];

    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (ctx.aliases.some((alias) => alias.name.escapedText === schemaName)) {
        continue;
      }

      const typeNode = getTypeFromSchema(ctx, schema, schemaName);
      const typeAlias = factory.createTypeAliasDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        schemaName,
        undefined,
        typeNode
      );

      types.push(typeAlias);
    }

    return types;
  }

  /**
   * Generates the extra endpoint definition properties specific to
   * queries. Currently a placeholder that adds nothing.
   *
   * @param params - The operation the properties would be generated for.
   * @returns The extra properties to add to the endpoint definition.
   *
   * @internal
   */
  // eslint-disable-next-line no-empty-pattern
  function generateQueryEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }

  /**
   * Generates the extra endpoint definition properties specific to
   * mutations. Currently a placeholder that adds nothing.
   *
   * @param params - The operation the properties would be generated for.
   * @returns The extra properties to add to the endpoint definition.
   *
   * @internal
   */
  // eslint-disable-next-line no-empty-pattern
  function generateMutationEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }
}

/**
 * Accesses a property of an object, falling back to bracket notation when
 * the name is not a valid identifier.
 *
 * @param rootObject - The object to read the property from.
 * @param propertyName - The name of the property to access.
 * @returns The property access expression.
 *
 * @internal
 */
function accessProperty(rootObject: ts.Identifier, propertyName: string) {
  return isValidIdentifier(propertyName)
    ? factory.createPropertyAccessExpression(rootObject, factory.createIdentifier(propertyName))
    : factory.createElementAccessExpression(rootObject, factory.createStringLiteral(propertyName));
}

/**
 * Turns an OpenAPI path into the expression that builds the request url,
 * substituting each `{placeholder}` for the query argument it names.
 *
 * A path with no placeholders yields a plain template literal rather than
 * one with substitutions.
 *
 * @param path - The OpenAPI path, e.g. `/pet/{petId}`.
 * @param pathParameters - The query arguments the placeholders may refer to.
 * @param rootObject - The identifier the arguments are read from.
 * @param isFlatArg - Whether the single query argument is passed directly rather than wrapped in an object.
 * @param encodePathParams - Whether to wrap each substitution in `encodeURIComponent`.
 * @returns The template expression building the url.
 * @throws An {@linkcode Error} if the path references a placeholder that is not among {@linkcode pathParameters}.
 *
 * @internal
 */
function generatePathExpression(
  path: string,
  pathParameters: QueryArgDefinition[],
  rootObject: ts.Identifier,
  isFlatArg: boolean,
  encodePathParams: boolean
) {
  const expressions: Array<[string, string]> = [];

  const head = path.replace(/\{(.*?)}(.*?)(?=\{|$)/g, (_, expression, literal) => {
    const param = pathParameters.find((p) => p.originalName === expression);
    if (!param) {
      throw new Error(`path parameter ${expression} does not seem to be defined in '${path}'!`);
    }
    expressions.push([param.name, literal]);
    return '';
  });

  return expressions.length
    ? factory.createTemplateExpression(
        factory.createTemplateHead(head),
        expressions.map(([prop, literal], index) => {
          const value = isFlatArg ? rootObject : accessProperty(rootObject, prop);
          const encodedValue = encodePathParams
            ? factory.createCallExpression(factory.createIdentifier('encodeURIComponent'), undefined, [
                factory.createCallExpression(factory.createIdentifier('String'), undefined, [value]),
              ])
            : value;
          return factory.createTemplateSpan(
            encodedValue,
            index === expressions.length - 1
              ? factory.createTemplateTail(literal)
              : factory.createTemplateMiddle(literal)
          );
        })
      )
    : factory.createNoSubstitutionTemplateLiteral(head);
}

/**
 * One argument of a generated endpoint, resolved from either an operation
 * parameter or the request body. The union on
 * {@linkcode QueryArgDefinition.origin | origin} discriminates the two,
 * so the source object is only reachable once the origin is known.
 *
 * @internal
 */
type QueryArgDefinition = {
  /**
   * The collision-free name of the generated property.
   */
  name: string;

  /**
   * The name as written in the schema, used as the key when the argument
   * is sent on the request.
   */
  originalName: string;

  /**
   * The generated type of the argument.
   */
  type: ts.TypeNode;

  /**
   * Whether the argument must be supplied.
   */
  required?: boolean;

  /**
   * The parameter the argument came from, present only when
   * {@linkcode QueryArgDefinition.origin | origin} is `param`.
   */
  param?: OpenAPIV3.ParameterObject;
} & (
  | {
      /**
       * Marks the argument as coming from an operation parameter.
       */
      origin: 'param';

      /**
       * The parameter the argument came from.
       */
      param: OpenAPIV3.ParameterObject;
    }
  | {
      /**
       * Marks the argument as coming from the request body.
       */
      origin: 'body';

      /**
       * The request body the argument came from.
       */
      body: OpenAPIV3.RequestBodyObject;
    }
);

/**
 * The arguments of one generated endpoint, keyed by their generated name.
 *
 * @internal
 */
type QueryArgDefinitions = Record<string, QueryArgDefinition>;
