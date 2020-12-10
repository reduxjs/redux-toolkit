import { EndpointDefinition } from "./apiModel";
import _ from "lodash";
import ApiGenerator, {
  verbs,
  getOperationName,
  supportDeepObjects,
  getReferenceName,
  isReference,
} from "oazapfts/lib/codegen/generate";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as ts from "typescript";
import { factory } from "typescript";
// @ts-ignore
import converter from "swagger2openapi";

import { OpenAPIV3 } from "openapi-types";
import {
  createQuestionToken,
  keywordType,
} from "oazapfts/lib/codegen/tscodegen";
import { ConstructorDeclaration } from "ts-morph";

type OperationDefinition = {
  path: string;
  verb: typeof operationKeys[number];
  pathItem: OpenAPIV3.PathItemObject;
  operation: OpenAPIV3.OperationObject;
};

const operationKeys = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

type GenerationOptions = {
  exportName?: string;
  reducerPath?: string;
  baseQuery?: string;
  isDataResponse?(
    code: string,
    response: OpenAPIV3.ResponseObject,
    allResponses: OpenAPIV3.ResponsesObject
  ): boolean;
};

function defaultIsDataResponse(
  code: string,
  response: OpenAPIV3.ResponseObject,
  allResponses: OpenAPIV3.ResponsesObject
): boolean {
  const parsedCode = Number(code);
  return !Number.isNaN(parsedCode) && parsedCode >= 200 && parsedCode < 300;
}

async function generateApi(
  spec: string,
  {
    exportName = "api",
    reducerPath,
    baseQuery = "fetchBaseQuery",
    isDataResponse = defaultIsDataResponse,
  }: GenerationOptions
) {
  let v3Doc: OpenAPIV3.Document;
  const doc = await SwaggerParser.bundle(spec);
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3");
  if (isOpenApiV3) {
    v3Doc = doc as OpenAPIV3.Document;
  } else {
    const result = await converter.convertObj(doc, {});
    v3Doc = result.openapi as OpenAPIV3.Document;
  }

  const apiGen = new ApiGenerator(v3Doc, {});

  const operationDefinitions: OperationDefinition[] = Object.entries(
    v3Doc.paths
  ).flatMap(([path, pathItem]) =>
    Object.entries(pathItem)
      .filter((arg): arg is [
        typeof operationKeys[number],
        OpenAPIV3.OperationObject
      ] => operationKeys.includes(arg[0] as any))
      .map(([verb, operation]) => ({
        path,
        verb,
        pathItem,
        operation,
      }))
  );

  const resultFile = ts.createSourceFile(
    "someFileName.ts",
    "",
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const interfaces: Record<
    string,
    ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  > = {};
  function registerInterface(
    declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  ) {
    const name = declaration.name.escapedText.toString();
    if (name in interfaces) {
      throw new Error("interface/type alias already registered");
    }
    interfaces[name] = declaration;
    return declaration;
  }

  return printer.printNode(
    ts.EmitHint.Unspecified,
    factory.createSourceFile(
      [
        generateImportNode("@rtk-incubator/rtk-query", {
          createApi: "createApi",
          fetchBaseQuery: "fetchBaseQuery",
        }),
        generateCreateApiCall(),
        ...Object.values(interfaces),
        ...apiGen["aliases"],
      ],
      factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    ),
    resultFile
  );

  function generateImportNode(
    pkg: string,
    namedImports: Record<string, string>,
    defaultImportName?: string
  ) {
    return factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
        false,
        defaultImportName !== undefined
          ? factory.createIdentifier(defaultImportName)
          : undefined,
        factory.createNamedImports(
          Object.entries(namedImports).map(([propertyName, name]) =>
            factory.createImportSpecifier(
              name === propertyName
                ? undefined
                : factory.createIdentifier(propertyName),
              factory.createIdentifier(name)
            )
          )
        )
      ),
      factory.createStringLiteral(pkg)
    );
  }

  function generateCreateApiCall() {
    return factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            factory.createIdentifier(exportName),
            undefined,
            undefined,
            factory.createCallExpression(
              factory.createIdentifier("createApi"),
              undefined,
              [
                factory.createObjectLiteralExpression(
                  [
                    !reducerPath
                      ? undefined
                      : factory.createPropertyAssignment(
                          factory.createIdentifier("reducerPath"),
                          factory.createStringLiteral(reducerPath)
                        ),
                    factory.createPropertyAssignment(
                      factory.createIdentifier("baseQuery"),
                      factory.createCallExpression(
                        factory.createIdentifier(baseQuery),
                        undefined,
                        [
                          factory.createObjectLiteralExpression(
                            [
                              factory.createPropertyAssignment(
                                factory.createIdentifier("baseUrl"),
                                factory.createStringLiteral(
                                  v3Doc.servers?.[0].url ??
                                    "https://example.com"
                                )
                              ),
                            ],
                            false
                          ),
                        ]
                      )
                    ),
                    factory.createPropertyAssignment(
                      factory.createIdentifier("entityTypes"),
                      generateEntityTypes({ v3Doc, operationDefinitions })
                    ),
                    factory.createPropertyAssignment(
                      factory.createIdentifier("endpoints"),
                      factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                          factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            undefined,
                            factory.createIdentifier("build"),
                            undefined,
                            undefined,
                            undefined
                          ),
                        ],
                        undefined,
                        factory.createToken(
                          ts.SyntaxKind.EqualsGreaterThanToken
                        ),
                        factory.createParenthesizedExpression(
                          factory.createObjectLiteralExpression(
                            operationDefinitions.map((operationDefinition) =>
                              generateEndpoint({
                                operationDefinition,
                              })
                            ),
                            true
                          )
                        )
                      )
                    ),
                  ].filter(removeUndefined),
                  true
                ),
              ]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    );
  }

  function generateEntityTypes(_: {
    operationDefinitions: OperationDefinition[];
    v3Doc: OpenAPIV3.Document;
  }) {
    return factory.createArrayLiteralExpression(
      [
        /*factory.createStringLiteral("Posts")*/
      ],
      false
    );
  }

  function generateEndpoint({
    operationDefinition,
  }: {
    operationDefinition: OperationDefinition;
  }) {
    const {
      verb,
      path,
      pathItem,
      operation,
      operation: { responses, requestBody },
    } = operationDefinition;

    const isQuery = operationDefinition.verb === "get";

    const returnsJson = apiGen.hasJsonContent(responses);
    let ResponseType: ts.TypeNode = factory.createKeywordTypeNode(
      ts.SyntaxKind.UnknownKeyword
    );
    if (returnsJson) {
      const returnTypes = Object.entries(responses || {})
        .map(
          ([code, response]) =>
            [
              code,
              apiGen.resolve(response),
              apiGen.getTypeFromResponse(response) ||
                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ] as const
        )
        .filter(([status, response]) =>
          isDataResponse(status, apiGen.resolve(response), responses || {})
        )
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
          _.upperFirst(
            getOperationName(verb, path, operation.operationId) + "Response"
          ),
          undefined,
          ResponseType
        )
      ).name
    );

    const parameters = supportDeepObjects([
      ...apiGen.resolveArray(pathItem.parameters),
      ...apiGen.resolveArray(operation.parameters),
    ]);

    const queryArg: QueryArgDefinitions = {};
    for (const param of parameters) {
      let name = _.camelCase(param.name);
      queryArg[name] = {
        origin: "param",
        name,
        originalName: param.name,
        type: apiGen.getTypeFromSchema(
          isReference(param) ? param : param.schema
        ),
        required: param.required,
        param,
      };
    }

    if (requestBody) {
      const body = apiGen.resolve(requestBody);
      const schema = apiGen.getSchemaFromContent(body.content);
      const type = apiGen.getTypeFromSchema(schema);
      const schemaName = _.camelCase(
        (type as any).name || getReferenceName(schema) || "body"
      );
      let name = schemaName in queryArg ? "body" : schemaName;

      while (name in queryArg) {
        name = "_" + name;
      }

      queryArg[schemaName] = {
        origin: "body",
        name,
        originalName: schemaName,
        type: apiGen.getTypeFromSchema(schema),
        required: true,
        body,
      };
    }

    // TODO strip param names where applicable
    //const stripped = _.camelCase(param.name.replace(/.+\./, ""));

    const QueryArg = factory.createTypeReferenceNode(
      registerInterface(
        factory.createTypeAliasDeclaration(
          undefined,
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          _.upperFirst(
            getOperationName(verb, path, operation.operationId) + "QueryArg"
          ),
          undefined,
          factory.createTypeLiteralNode(
            Object.entries(queryArg).map(([name, def]) =>
              ts.addSyntheticLeadingComment(
                factory.createPropertySignature(
                  undefined,
                  name,
                  createQuestionToken(!def.required),
                  def.type
                ),
                ts.SyntaxKind.MultiLineCommentTrivia,
                `* ${
                  def.origin === "param"
                    ? def.param.description
                    : def.body.description
                } `,
                true
              )
            )
          )
        )
      ).name
    );

    return factory.createPropertyAssignment(
      factory.createIdentifier(
        getOperationName(verb, path, operation.operationId)
      ),

      factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier("build"),
          factory.createIdentifier(isQuery ? "query" : "mutation")
        ),
        [ResponseTypeName, QueryArg],
        [
          factory.createObjectLiteralExpression(
            [
              factory.createPropertyAssignment(
                factory.createIdentifier("query"),
                generateQueryFn({ operationDefinition, queryArg })
              ),
              ...(isQuery
                ? generateQueryEndpointProps({ operationDefinition })
                : generateMutationEndpointProps({ operationDefinition })),
            ],
            true
          ),
        ]
      )
    );
  }

  function generateQueryFn({
    operationDefinition,
    queryArg,
  }: {
    operationDefinition: OperationDefinition;
    queryArg: QueryArgDefinitions;
  }) {
    const { path } = operationDefinition;

    const pathParameters = Object.values(queryArg).filter(
      (def) => def.origin === "param" && def.param.in === "path"
    );
    const queryParameters = Object.values(queryArg).filter(
      (def) => def.origin === "param" && def.param.in === "query"
    );
    const headerParameters = Object.values(queryArg).filter(
      (def) => def.origin === "param" && def.param.in === "header"
    );
    const cookieParameters = Object.values(queryArg).filter(
      (def) => def.origin === "param" && def.param.in === "cookie"
    );
    const bodyParameter = Object.values(queryArg).find(
      (def) => def.origin === "body"
    );

    const rootObject = factory.createIdentifier("queryArg");

    return factory.createArrowFunction(
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          rootObject,
          undefined,
          undefined,
          undefined
        ),
      ],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createParenthesizedExpression(
        factory.createObjectLiteralExpression(
          [
            factory.createPropertyAssignment(
              factory.createIdentifier("url"),
              generatePathExpression(path, pathParameters, rootObject)
            ),
            bodyParameter == undefined
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier("body"),
                  factory.createPropertyAccessExpression(
                    rootObject,
                    factory.createIdentifier(bodyParameter.name)
                  )
                ),
            cookieParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier("cookies"),
                  generateQuerArgObjectLiteralExpression(
                    cookieParameters,
                    rootObject
                  )
                ),
            headerParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier("headers"),
                  generateQuerArgObjectLiteralExpression(
                    headerParameters,
                    rootObject
                  )
                ),
            queryParameters.length == 0
              ? undefined
              : factory.createPropertyAssignment(
                  factory.createIdentifier("params"),
                  generateQuerArgObjectLiteralExpression(
                    queryParameters,
                    rootObject
                  )
                ),
          ].filter(removeUndefined),
          false
        )
      )
    );
  }

  function generateQueryEndpointProps({
    operationDefinition,
  }: {
    operationDefinition: OperationDefinition;
  }) {
    return (
      [] || /* TODO needs implementation - skip for now */ [
        factory.createPropertyAssignment(
          factory.createIdentifier("provides"),
          factory.createArrowFunction(
            undefined,
            undefined,
            [
              factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("_"),
                undefined,
                undefined,
                undefined
              ),
              factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("id"),
                undefined,
                undefined,
                undefined
              ),
            ],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            factory.createArrayLiteralExpression(
              [
                factory.createObjectLiteralExpression(
                  [
                    factory.createPropertyAssignment(
                      factory.createIdentifier("type"),
                      factory.createStringLiteral("Posts")
                    ),
                    factory.createShorthandPropertyAssignment(
                      factory.createIdentifier("id"),
                      undefined
                    ),
                  ],
                  false
                ),
              ],
              false
            )
          )
        ),
      ]
    );
  }

  function generateMutationEndpointProps(_: {
    operationDefinition: OperationDefinition;
  }) {
    return (
      [] || /* TODO needs implementation - skip for now */ [
        factory.createPropertyAssignment(
          factory.createIdentifier("invalidates"),
          factory.createArrayLiteralExpression(
            [
              factory.createObjectLiteralExpression(
                [
                  factory.createPropertyAssignment(
                    factory.createIdentifier("type"),
                    factory.createStringLiteral("Posts")
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("id"),
                    factory.createStringLiteral("LIST")
                  ),
                ],
                false
              ),
            ],
            false
          )
        ),
      ]
    );
  }

  function removeUndefined<T>(t: T | undefined): t is T {
    return typeof t !== "undefined";
  }
}

function generatePathExpression(
  path: string,
  pathParameters: QueryArgDefinition[],
  rootObject: ts.Identifier
) {
  const expressions: Array<[string, string]> = [];

  const head = path.replace(
    /\{(.*?)\}(.*?)(?=\{|$)/g,
    (_, expression, literal) => {
      const param = pathParameters.find((p) => p.originalName === expression);
      if (!param) {
        throw new Error(
          `path parameter ${expression} does not seem to be defined?`
        );
      }
      expressions.push([param.name, literal]);
      return "";
    }
  );

  return expressions.length
    ? factory.createTemplateExpression(
        factory.createTemplateHead(head),
        expressions.map(([prop, literal], index) =>
          factory.createTemplateSpan(
            factory.createPropertyAccessExpression(
              rootObject,
              factory.createIdentifier(prop)
            ),
            index === expressions.length - 1
              ? factory.createTemplateTail(literal)
              : factory.createTemplateMiddle(literal)
          )
        )
      )
    : factory.createNoSubstitutionTemplateLiteral(head);
}

function generateQuerArgObjectLiteralExpression(
  queryArgs: QueryArgDefinition[],
  rootObject: ts.Identifier
) {
  return factory.createObjectLiteralExpression(
    queryArgs.map(
      (param) =>
        factory.createPropertyAssignment(
          factory.createIdentifier(param.originalName),
          factory.createPropertyAccessExpression(
            rootObject,
            factory.createIdentifier(param.name)
          )
        ),
      true
    )
  );
}

type QueryArgDefinition = {
  name: string;
  originalName: string;
  type: ts.TypeNode;
  required?: boolean;
} & (
  | {
      origin: "param";
      param: OpenAPIV3.ParameterObject;
    }
  | {
      origin: "body";
      body: OpenAPIV3.RequestBodyObject;
    }
);
type QueryArgDefinitions = Record<string, QueryArgDefinition>;

generateApi(
  "/home/weber/tmp/rtk-query-codegen-openapi/test/petstore.json",
  {}
).then((result) => console.log(result));
