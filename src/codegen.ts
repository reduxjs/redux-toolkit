import * as ts from 'typescript';
const { factory } = ts;

const defaultEndpointBuilder = factory.createIdentifier('build');

export type ObjectPropertyDefinitions = Record<string, ts.Expression>;
export function generateObjectProperties(obj: ObjectPropertyDefinitions) {
  return Object.entries(obj).map(([k, v]) => factory.createPropertyAssignment(factory.createIdentifier(k), v));
}

export function generateStringLiteralArray(arr: string[]) {
  return factory.createArrayLiteralExpression(
    arr.map((elem) => factory.createStringLiteral(elem)),
    false
  );
}

export function generateImportNode(pkg: string, namedImports: Record<string, string>, defaultImportName?: string) {
  return factory.createImportDeclaration(
    undefined,
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

export function generateCreateApiCall({
  exportName,
  reducerPath,
  createApiFn,
  baseQuery,
  tagTypes,
  endpointBuilder = defaultEndpointBuilder,
  endpointDefinitions,
}: {
  exportName: string;
  reducerPath?: string;
  createApiFn: ts.Expression;
  baseQuery: ts.Expression;
  tagTypes: ts.Expression;
  endpointBuilder?: ts.Identifier;
  endpointDefinitions: ts.ObjectLiteralExpression;
}) {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createIdentifier(exportName),
          undefined,
          undefined,
          factory.createCallExpression(createApiFn, undefined, [
            factory.createObjectLiteralExpression(
              generateObjectProperties({
                ...(!reducerPath ? {} : { reducerPath: factory.createStringLiteral(reducerPath) }),
                baseQuery,
                tagTypes,
                endpoints: factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      undefined,
                      endpointBuilder,
                      undefined,
                      undefined,
                      undefined
                    ),
                  ],
                  undefined,
                  factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  factory.createParenthesizedExpression(endpointDefinitions)
                ),
              }),
              true
            ),
          ])
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

export function generateEndpointDefinition({
  operationName,
  type,
  Response,
  QueryArg,
  queryFn,
  endpointBuilder = defaultEndpointBuilder,
  extraEndpointsProps,
}: {
  operationName: string;
  type: 'query' | 'mutation';
  Response: ts.TypeReferenceNode;
  QueryArg: ts.TypeReferenceNode;
  queryFn: ts.Expression;
  endpointBuilder?: ts.Identifier;
  extraEndpointsProps: ObjectPropertyDefinitions;
}) {
  return factory.createPropertyAssignment(
    factory.createIdentifier(operationName),

    factory.createCallExpression(
      factory.createPropertyAccessExpression(endpointBuilder, factory.createIdentifier(type)),
      [Response, QueryArg],
      [
        factory.createObjectLiteralExpression(
          generateObjectProperties({ query: queryFn, ...extraEndpointsProps }),
          true
        ),
      ]
    )
  );
}
