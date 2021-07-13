import * as ts from 'typescript';
import * as path from 'path';
import { camelCase } from 'lodash';
import ApiGenerator, {
  getOperationName,
  getReferenceName,
  isReference,
  supportDeepObjects,
} from 'oazapfts/lib/codegen/generate';
import {
  createQuestionToken,
  keywordType,
  createPropertyAssignment,
  isValidIdentifier,
} from 'oazapfts/lib/codegen/tscodegen';
import { OpenAPIV3 } from 'openapi-types';
import { generateReactHooks } from './generators/react-hooks';
import { GenerationOptions, OperationDefinition } from './types';
import { capitalize, getOperationDefinitions, getV3Doc, isQuery, MESSAGES, removeUndefined } from './utils';
import {
  generateCreateApiCall,
  generateEndpointDefinition,
  generateStringLiteralArray,
  ObjectPropertyDefinitions,
} from './codegen';
import { generateSmartImportNode } from './generators/smart-import-node';
import { generateImportNode } from './generators/import-node';

const { factory } = ts;

function defaultIsDataResponse(code: string) {
  const parsedCode = Number(code);
  return !Number.isNaN(parsedCode) && parsedCode >= 200 && parsedCode < 300;
}

let customBaseQueryNode: ts.ImportDeclaration | undefined;
let moduleName: string;

export async function generateApi(
  spec: string,
  {
    exportName = 'api',
    reducerPath,
    baseQuery = 'fetchBaseQuery',
    argSuffix = 'ApiArg',
    responseSuffix = 'ApiResponse',
    baseUrl,
    hooks,
    outputFile,
    isDataResponse = defaultIsDataResponse,
    compilerOptions,
  }: GenerationOptions
) {
  const v3Doc = await getV3Doc(spec);
  if (typeof baseUrl !== 'string') {
    baseUrl = v3Doc.servers?.[0].url ?? 'https://example.com';
  } else if (baseQuery !== 'fetchBaseQuery') {
    console.warn(MESSAGES.BASE_URL_IGNORED);
  }

  const apiGen = new ApiGenerator(v3Doc, {});

  const operationDefinitions = getOperationDefinitions(v3Doc);

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

  /**
   * --baseQuery handling
   * 1. If baseQuery is specified, we confirm that the file exists
   * 2. If there is a seperator in the path, file presence + named function existence is verified.
   * 3. If there is a not a seperator, file presence + default export existence is verified.
   */

  if (outputFile) {
    outputFile = path.resolve(process.cwd(), outputFile);
  }

  // If a baseQuery was specified as an arg, we try to parse and resolve it. If not, fallback to `fetchBaseQuery` or throw when appropriate.

  let targetName = 'default';
  if (baseQuery !== 'fetchBaseQuery') {
    if (baseQuery.includes(':')) {
      // User specified a named function
      [moduleName, baseQuery] = baseQuery.split(':');

      if (!baseQuery) {
        throw new Error(MESSAGES.NAMED_EXPORT_MISSING);
      }
      targetName = baseQuery;
    } else {
      moduleName = baseQuery;
      baseQuery = 'customBaseQuery';
    }

    customBaseQueryNode = generateSmartImportNode({
      moduleName,
      containingFile: outputFile,
      targetName,
      targetAlias: baseQuery,
      compilerOptions,
    });
  }

  const fetchBaseQueryCall = factory.createCallExpression(factory.createIdentifier('fetchBaseQuery'), undefined, [
    factory.createObjectLiteralExpression(
      [factory.createPropertyAssignment(factory.createIdentifier('baseUrl'), factory.createStringLiteral(baseUrl))],
      false
    ),
  ]);

  const isUsingFetchBaseQuery = baseQuery === 'fetchBaseQuery';

  function getBasePackageImportsFromOptions() {
    return hooks
      ? {
          ...(isUsingFetchBaseQuery ? { fetchBaseQuery: 'fetchBaseQuery' } : {}),
        }
      : {
          createApi: 'createApi',
          ...(isUsingFetchBaseQuery ? { fetchBaseQuery: 'fetchBaseQuery' } : {}),
        };
  }

  const hasBasePackageImports = Object.keys(getBasePackageImportsFromOptions()).length > 0;

  const sourceCode = printer.printNode(
    ts.EmitHint.Unspecified,
    factory.createSourceFile(
      [
        // If hooks are specified, we need to import them from the react entry point
        ...(hooks
          ? [
              generateImportNode('@reduxjs/toolkit/query/react', {
                createApi: 'createApi',
              }),
            ]
          : []),
        ...(hasBasePackageImports
          ? [generateImportNode('@reduxjs/toolkit/query', getBasePackageImportsFromOptions())]
          : []),
        ...(customBaseQueryNode ? [customBaseQueryNode] : []),
        generateCreateApiCall({
          exportName,
          reducerPath,
          createApiFn: factory.createIdentifier('createApi'),
          baseQuery: isUsingFetchBaseQuery ? fetchBaseQueryCall : factory.createIdentifier(baseQuery),
          tagTypes: generateTagTypes({ v3Doc, operationDefinitions }),
          endpointDefinitions: factory.createObjectLiteralExpression(
            operationDefinitions.map((operationDefinition) =>
              generateEndpoint({
                operationDefinition,
              })
            ),
            true
          ),
        }),
        ...Object.values(interfaces),
        ...apiGen['aliases'],
        ...(hooks ? [generateReactHooks({ exportName, operationDefinitions })] : []),
      ],
      factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    ),
    resultFile
  );

  return sourceCode;

  function generateTagTypes(_: { operationDefinitions: OperationDefinition[]; v3Doc: OpenAPIV3.Document }) {
    return generateStringLiteralArray([]); // TODO
  }

  function generateEndpoint({ operationDefinition }: { operationDefinition: OperationDefinition }) {
    const {
      verb,
      path,
      pathItem,
      operation,
      operation: { responses, requestBody },
    } = operationDefinition;

    const _isQuery = isQuery(verb);

    const returnsJson = apiGen.getResponseType(responses) === 'json';
    let ResponseType: ts.TypeNode = factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    if (returnsJson) {
      const returnTypes = Object.entries(responses || {})
        .map(
          ([code, response]) =>
            [
              code,
              apiGen.resolve(response),
              apiGen.getTypeFromResponse(response) || factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ] as const
        )
        .filter(([status, response]) => isDataResponse(status, apiGen.resolve(response), responses || {}))
        .map(([code, response, type]) =>
          ts.addSyntheticLeadingComment(
            { ...type },
            ts.SyntaxKind.MultiLineCommentTrivia,
            `* status ${code} ${response.description} `,
            false
          )
        )
        .filter((type) => type !== keywordType.void);
      if (returnTypes.length > 0) {
        ResponseType = factory.createUnionTypeNode(returnTypes);
      }
    }

    const ResponseTypeName = factory.createTypeReferenceNode(
      registerInterface(
        factory.createTypeAliasDeclaration(
          undefined,
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          capitalize(getOperationName(verb, path, operation.operationId) + responseSuffix),
          undefined,
          ResponseType
        )
      ).name
    );

    const parameters = supportDeepObjects([
      ...apiGen.resolveArray(pathItem.parameters),
      ...apiGen.resolveArray(operation.parameters),
    ]);

    const allNames = parameters.map((p) => p.name);
    const queryArg: QueryArgDefinitions = {};
    for (const param of parameters) {
      const isPureSnakeCase = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(param.name);
      const camelCaseName = camelCase(param.name);

      const name = isPureSnakeCase && !allNames.includes(camelCaseName) ? camelCaseName : param.name;

      queryArg[name] = {
        origin: 'param',
        name,
        originalName: param.name,
        type: apiGen.getTypeFromSchema(isReference(param) ? param : param.schema),
        required: param.required,
        param,
      };
    }

    if (requestBody) {
      const body = apiGen.resolve(requestBody);
      const schema = apiGen.getSchemaFromContent(body.content);
      const type = apiGen.getTypeFromSchema(schema);
      const schemaName = camelCase((type as any).name || getReferenceName(schema) || 'body');
      let name = schemaName in queryArg ? 'body' : schemaName;

      while (name in queryArg) {
        name = '_' + name;
      }

      queryArg[name] = {
        origin: 'body',
        name,
        originalName: schemaName,
        type: apiGen.getTypeFromSchema(schema),
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

    const QueryArg = factory.createTypeReferenceNode(
      registerInterface(
        factory.createTypeAliasDeclaration(
          undefined,
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          capitalize(getOperationName(verb, path, operation.operationId) + argSuffix),
          undefined,
          factory.createTypeLiteralNode(
            Object.values(queryArg).map((def) => {
              const comment = def.origin === 'param' ? def.param.description : def.body.description;
              const node = factory.createPropertySignature(
                undefined,
                propertyName(def.name),
                createQuestionToken(!def.required),
                def.type
              );

              if (comment) {
                return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, `* ${comment} `, true);
              }
              return node;
            })
          )
        )
      ).name
    );

    return generateEndpointDefinition({
      operationName: getOperationName(verb, path, operation.operationId),
      type: _isQuery ? 'query' : 'mutation',
      Response: ResponseTypeName,
      QueryArg,
      queryFn: generateQueryFn({ operationDefinition, queryArg }),
      extraEndpointsProps: _isQuery
        ? generateQueryEndpointProps({ operationDefinition })
        : generateMutationEndpointProps({ operationDefinition }),
    });
  }

  function generateQueryFn({
    operationDefinition,
    queryArg,
  }: {
    operationDefinition: OperationDefinition;
    queryArg: QueryArgDefinitions;
  }) {
    const { path, verb } = operationDefinition;

    const pathParameters = Object.values(queryArg).filter((def) => def.origin === 'param' && def.param.in === 'path');
    const queryParameters = Object.values(queryArg).filter((def) => def.origin === 'param' && def.param.in === 'query');
    const headerParameters = Object.values(queryArg).filter(
      (def) => def.origin === 'param' && def.param.in === 'header'
    );
    const cookieParameters = Object.values(queryArg).filter(
      (def) => def.origin === 'param' && def.param.in === 'cookie'
    );
    const bodyParameter = Object.values(queryArg).find((def) => def.origin === 'body');

    const rootObject = factory.createIdentifier('queryArg');

    return factory.createArrowFunction(
      undefined,
      undefined,
      Object.keys(queryArg).length
        ? [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              rootObject,
              undefined,
              undefined,
              undefined
            ),
          ]
        : [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createParenthesizedExpression(
        factory.createObjectLiteralExpression(
          [
            factory.createPropertyAssignment(
              factory.createIdentifier('url'),
              generatePathExpression(path, pathParameters, rootObject)
            ),
            isQuery(verb)
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('method'),
                  factory.createStringLiteral(verb.toUpperCase())
                ),
            bodyParameter == undefined
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('body'),
                  factory.createPropertyAccessExpression(rootObject, factory.createIdentifier(bodyParameter.name))
                ),
            cookieParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('cookies'),
                  generateQuerArgObjectLiteralExpression(cookieParameters, rootObject)
                ),
            headerParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('headers'),
                  generateQuerArgObjectLiteralExpression(headerParameters, rootObject)
                ),
            queryParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier('params'),
                  generateQuerArgObjectLiteralExpression(queryParameters, rootObject)
                ),
          ].filter(removeUndefined),
          false
        )
      )
    );
  }

  function generateQueryEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }

  function generateMutationEndpointProps({}: { operationDefinition: OperationDefinition }): ObjectPropertyDefinitions {
    return {}; /* TODO needs implementation - skip for now */
  }
}

function accessProperty(rootObject: ts.Identifier, propertyName: string) {
  return isValidIdentifier(propertyName)
    ? factory.createPropertyAccessExpression(rootObject, factory.createIdentifier(propertyName))
    : factory.createElementAccessExpression(rootObject, factory.createStringLiteral(propertyName));
}

function generatePathExpression(path: string, pathParameters: QueryArgDefinition[], rootObject: ts.Identifier) {
  const expressions: Array<[string, string]> = [];

  const head = path.replace(/\{(.*?)\}(.*?)(?=\{|$)/g, (_, expression, literal) => {
    const param = pathParameters.find((p) => p.originalName === expression);
    if (!param) {
      throw new Error(`path parameter ${expression} does not seem to be defined?`);
    }
    expressions.push([param.name, literal]);
    return '';
  });

  return expressions.length
    ? factory.createTemplateExpression(
        factory.createTemplateHead(head),
        expressions.map(([prop, literal], index) =>
          factory.createTemplateSpan(
            accessProperty(rootObject, prop),
            index === expressions.length - 1
              ? factory.createTemplateTail(literal)
              : factory.createTemplateMiddle(literal)
          )
        )
      )
    : factory.createNoSubstitutionTemplateLiteral(head);
}

function generateQuerArgObjectLiteralExpression(queryArgs: QueryArgDefinition[], rootObject: ts.Identifier) {
  return factory.createObjectLiteralExpression(
    queryArgs.map((param) => createPropertyAssignment(param.originalName, accessProperty(rootObject, param.name)), true)
  );
}

type QueryArgDefinition = {
  name: string;
  originalName: string;
  type: ts.TypeNode;
  required?: boolean;
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
