import camelCase from 'lodash.camelcase';
import path from 'node:path';
import ApiGenerator, {
  getOperationName as _getOperationName,
  getReferenceName,
  isReference,
  supportDeepObjects,
  createPropertyAssignment,
  createQuestionToken,
  isValidIdentifier,
  keywordType,
} from 'oazapfts/generate';
import type { OpenAPIV3 } from 'openapi-types';
import ts from 'typescript';

import type { ObjectPropertyDefinitions } from './codegen';
import {
  generateCreateApiCall,
  generateEndpointDefinition,
  generateImportNode,
  generateTagTypes,
} from './codegen';
import { CustomApiGenerator } from './generators/CustomApiGenerator';
import { generateReactHooks } from './generators/react-hooks';
import type {
  EndpointMatcher,
  EndpointOverrides,
  GenerationOptions,
  OperationDefinition,
  ParameterDefinition,
  ParameterMatcher,
  TextMatcher,
} from './types';
import { capitalize, getOperationDefinitions, getV3Doc, removeUndefined, isQuery as testIsQuery } from './utils';
import { factory } from './utils/factory';

const generatedApiName = 'injectedRtkApi';
const v3DocCache: Record<string, OpenAPIV3.Document> = {};

function defaultIsDataResponse(code: string, includeDefault: boolean) {
  if (includeDefault && code === 'default') {
    return true;
  }
  const parsedCode = Number(code);
  return !Number.isNaN(parsedCode) && parsedCode >= 200 && parsedCode < 300;
}

function getOperationName({ verb, path, operation }: Pick<OperationDefinition, 'verb' | 'path' | 'operation'>) {
  return _getOperationName(verb, path, operation.operationId);
}

function getTags({ verb, pathItem }: Pick<OperationDefinition, 'verb' | 'pathItem'>): string[] {
  return verb ? pathItem[verb]?.tags || [] : [];
}

function patternMatches(pattern?: TextMatcher) {
  const filters = Array.isArray(pattern) ? pattern : [pattern];
  return function matcher(operationName: string) {
    if (!pattern) return true;
    return filters.some((filter) =>
      typeof filter === 'string' ? filter === operationName : filter?.test(operationName)
    );
  };
}

function operationMatches(pattern?: EndpointMatcher) {
  const checkMatch = typeof pattern === 'function' ? pattern : patternMatches(pattern);
  return function matcher(operationDefinition: OperationDefinition) {
    if (!pattern) return true;
    const operationName = getOperationName(operationDefinition);
    return checkMatch(operationName, operationDefinition);
  };
}

function argumentMatches(pattern?: ParameterMatcher) {
  const checkMatch = typeof pattern === 'function' ? pattern : patternMatches(pattern);
  return function matcher(argumentDefinition: ParameterDefinition) {
    if (!pattern || argumentDefinition.in === 'path') return true;
    const argumentName = argumentDefinition.name;
    return checkMatch(argumentName, argumentDefinition);
  };
}

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

export function getOverrides(
  operation: OperationDefinition,
  endpointOverrides?: EndpointOverrides[]
): EndpointOverrides | undefined {
  return endpointOverrides?.find((override) => operationMatches(override.pattern)(operation));
}

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
    mergeReadWriteOnly = false,
    httpResolverOptions,
    uuidHandling,
    requireAllProperties,
  }: GenerationOptions
) {
  const v3Doc = (v3DocCache[spec] ??= await getV3Doc(spec, httpResolverOptions));

  const apiGen = new CustomApiGenerator(uuidHandling, requireAllProperties, v3Doc, {
    unionUndefined,
    useEnumType,
    mergeReadWriteOnly,
    optimistic: true,
  });

  // temporary workaround for https://github.com/oazapfts/oazapfts/issues/491
  if (apiGen.spec.components?.schemas) {
    apiGen.preprocessComponents(apiGen.spec.components.schemas);
  }

  const operationDefinitions = getOperationDefinitions(v3Doc).filter(operationMatches(filterEndpoints));

  const resultFile = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const interfaces: Record<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration> = {};
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
  apiFile = apiFile.replace(/\.[jt]sx?$/, '');

  let statements: ts.Statement[] = [];
  if (uuidHandling) {
    statements.push(generateImportNode(uuidHandling.importfile, { [uuidHandling.typeName]: uuidHandling.typeName }));
  }
  statements = [...statements,
    generateImportNode(apiFile, { [apiImport]: 'api' }),
    ...(tag ? [generateTagTypes({ addTagTypes: extractAllTagTypes({ operationDefinitions }) })] : []),
    generateCreateApiCall({
      tag,
      endpointDefinitions: factory.createObjectLiteralExpression(
        operationDefinitions.map((operationDefinition) =>
          generateEndpoint({
            operationDefinition,
            overrides: getOverrides(operationDefinition, endpointOverrides),
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
    ...apiGen.aliases,
    ...apiGen.enumAliases,
    ...(hooks
      ? [
          generateReactHooks({
            exportName: generatedApiName,
            operationDefinitions,
            endpointOverrides,
            config: hooks,
          }),
        ]
      : []),
  ];

  return printer.printNode(
    ts.EmitHint.Unspecified,
    factory.createSourceFile(
      statements,
      factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    ),
    resultFile
  );

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

  function generateEndpoint({
    operationDefinition,
    overrides,
  }: {
    operationDefinition: OperationDefinition;
    overrides?: EndpointOverrides;
  }) {
    const {
      verb,
      path,
      pathItem,
      operation,
      operation: { responses, requestBody },
    } = operationDefinition;
    const operationName = getOperationName({ verb, path, operation });
    const tags = tag ? getTags({ verb, pathItem }) : [];
    const isQuery = testIsQuery(verb, overrides);

    const returnsJson = apiGen.getResponseType(responses) === 'json';
    let ResponseType: ts.TypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    if (returnsJson) {
      const returnTypes = Object.entries(responses || {})
        .map(
          ([code, response]) =>
            [
              code,
              apiGen.resolve(response),
              apiGen.getTypeFromResponse(response, 'readOnly') ||
                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ] as const
        )
        .filter(([status, response]) =>
          isDataResponse(status, includeDefault, apiGen.resolve(response), responses || {})
        )
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

    const operationParameters = apiGen.resolveArray(operation.parameters);
    const pathItemParameters = apiGen
      .resolveArray(pathItem.parameters)
      .filter((pp) => !operationParameters.some((op) => op.name === pp.name && op.in === pp.in));

    const parameters = supportDeepObjects([...pathItemParameters, ...operationParameters]).filter(
      argumentMatches(overrides?.parameterFilter)
    );

    const allNames = parameters.map((p) => p.name);
    const queryArg: QueryArgDefinitions = {};
    function generateName(name: string, potentialPrefix: string) {
      const isPureSnakeCase = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
      // prefix with `query`, `path` or `body` if there are multiple paramters with the same name
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
        type: apiGen.getTypeFromSchema(isReference(param) ? param : param.schema, undefined, 'writeOnly'),
        required: param.required,
        param,
      };
    }

    if (requestBody) {
      const body = apiGen.resolve(requestBody);
      const schema = apiGen.getSchemaFromContent(body.content);
      const type = apiGen.getTypeFromSchema(schema);
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
        type: apiGen.getTypeFromSchema(schema, undefined, 'writeOnly'),
        required: true,
        body,
      };
    }

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
    });
  }

  function generateQueryFn({
    operationDefinition,
    queryArg,
    isFlatArg,
    isQuery,
    encodePathParams,
    encodeQueryParams,
  }: {
    operationDefinition: OperationDefinition;
    queryArg: QueryArgDefinitions;
    isFlatArg: boolean;
    isQuery: boolean;
    encodePathParams: boolean;
    encodeQueryParams: boolean;
  }) {
    const { path, verb } = operationDefinition;

    const bodyParameter = Object.values(queryArg).find((def) => def.origin === 'body');

    const rootObject = factory.createIdentifier('queryArg');

    function pickParams(paramIn: string) {
      return Object.values(queryArg).filter((def) => def.origin === 'param' && def.param.in === paramIn);
    }

    function createObjectLiteralProperty(parameters: QueryArgDefinition[], propertyName: string) {
      if (parameters.length === 0) return undefined;

      const properties = parameters.map((param) => {
        const value = isFlatArg ? rootObject : accessProperty(rootObject, param.name);

        const encodedValue =
          encodeQueryParams && param.param?.in === 'query'
            ? factory.createConditionalExpression(
                value,
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

  // eslint-disable-next-line no-empty-pattern
  function generateQueryEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }

  // eslint-disable-next-line no-empty-pattern
  function generateMutationEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }
}

function accessProperty(rootObject: ts.Identifier, propertyName: string) {
  return isValidIdentifier(propertyName)
    ? factory.createPropertyAccessExpression(rootObject, factory.createIdentifier(propertyName))
    : factory.createElementAccessExpression(rootObject, factory.createStringLiteral(propertyName));
}

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

type QueryArgDefinition = {
  name: string;
  originalName: string;
  type: ts.TypeNode;
  required?: boolean;
  param?: OpenAPIV3.ParameterObject;
} & (
  | {
      origin: 'param';
      param: OpenAPIV3.ParameterObject;
    }
  | {
      origin: 'body';
      body: OpenAPIV3.RequestBodyObject;
    }
);
type QueryArgDefinitions = Record<string, QueryArgDefinition>;
