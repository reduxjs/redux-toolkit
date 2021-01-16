import * as ts from 'typescript';

const { factory } = ts;

export function generateImportNode(pkg: string, namedImports: Record<string, string>, defaultImportName?: string) {
  return factory.createImportDeclaration(
    undefined,
    undefined,
    factory.createImportClause(
      false,
      defaultImportName !== undefined ? factory.createIdentifier(defaultImportName) : undefined,
      factory.createNamedImports(
        Object.entries(namedImports)
          .filter((args) => args[1])
          .map(([propertyName, name]) =>
            factory.createImportSpecifier(
              name === propertyName ? undefined : factory.createIdentifier(propertyName),
              factory.createIdentifier(name as string)
            )
          )
      )
    ),
    factory.createStringLiteral(pkg)
  );
}
