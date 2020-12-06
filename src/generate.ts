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

  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    factory.createSourceFile(
      [
        generateImportNode("@rtk-incubator/rtk-query", {
          createApi: "createApi",
          baseFetchQuery: "baseFetchQuery",
        }),
        generateCreateApiCall(),
      ],
      factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    ),
    resultFile
  );
  console.log(result);

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
                      factory.createIdentifier(baseQuery)
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
        .filter(([status, response]) =>
          isDataResponse(status, apiGen.resolve(response), responses || {})
        )
        .map(([_, response]) => apiGen.getTypeFromResponse(response))
        .filter((type) => type !== keywordType.void);
      if (returnTypes.length > 0) {
        ResponseType = factory.createUnionTypeNode(returnTypes);
      }
    }

    const parameters = supportDeepObjects([
      ...apiGen.resolveArray(pathItem.parameters),
      ...apiGen.resolveArray(operation.parameters),
    ]);
    const queryArg: Record<
      string,
      {
        name: string;
        originalName: string;
        origin: "param" | "body";
        type: ts.TypeNode;
        required?: boolean;
      }
    > = {};
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
      };
    }

    // TODO strip param names where applicable
    //const stripped = _.camelCase(param.name.replace(/.+\./, ""));

    const QueryArg = factory.createTypeLiteralNode(
      Object.entries(queryArg).map(([name, def]) =>
        factory.createPropertySignature(
          undefined,
          name,
          createQuestionToken(!def.required),
          def.type
        )
      )
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
        [ResponseType, QueryArg],
        [
          factory.createObjectLiteralExpression(
            [
              factory.createPropertyAssignment(
                factory.createIdentifier("query"),
                factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      undefined,
                      factory.createIdentifier("queryArg"),
                      undefined,
                      undefined,
                      undefined
                    ),
                  ],
                  undefined,
                  factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  factory.createStringLiteral(path)
                )
              ),

              /*
              TODO
              ...(isQuery
                ? generateQueryEndpointProps({ operationDefinition })
                : generateMutationEndpointProps({ operationDefinition })),
                */
            ],
            true
          ),
        ]
      )
    );
  }

  function generateQueryFn(_: { operationDefinition: OperationDefinition }) {}

  function generateQueryEndpointProps({
    operationDefinition,
  }: {
    operationDefinition: OperationDefinition;
  }) {
    const {
      operation: { responses },
    } = operationDefinition;
    const returnsJson = apiGen.hasJsonContent(responses);
    const ResponseType =
      (returnsJson &&
        apiGen.getTypeFromResponses(
          Object.fromEntries(
            Object.entries(responses || {}).filter(([status, response]) =>
              isDataResponse(status, apiGen.resolve(response), responses || {})
            )
          )
        )) ||
      factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);

    return [
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
    ];
  }

  function generateMutationEndpointProps(_: {
    operationDefinition: OperationDefinition;
  }) {
    return [
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
    ];
  }

  function removeUndefined<T>(t: T | undefined): t is T {
    return typeof t !== "undefined";
  }
}

generateApi("/home/weber/tmp/rtk-query-codegen-openapi/test/petstore.json", {});
