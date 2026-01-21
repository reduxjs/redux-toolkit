import ts from 'typescript';

const originalFactory = ts.factory;

function createImportSpecifier(propertyName: ts.Identifier | undefined, name: ts.Identifier): ts.ImportSpecifier {
  return originalFactory.createImportSpecifier(false, propertyName, name);
}

function createExportSpecifier(
  propertyName: string | ts.Identifier | undefined,
  name: string | ts.Identifier
): ts.ExportSpecifier {
  return originalFactory.createExportSpecifier(false, propertyName, name);
}

export const factory = {
  ...originalFactory,
  createImportSpecifier,
  createExportSpecifier,
} satisfies Omit<ts.NodeFactory, 'createImportSpecifier' | 'createExportSpecifier'> & {
  createImportSpecifier: typeof createImportSpecifier;
  createExportSpecifier: typeof createExportSpecifier;
} as Omit<ts.NodeFactory, 'createImportSpecifier' | 'createExportSpecifier'> & {
  createImportSpecifier: typeof createImportSpecifier;
  createExportSpecifier: typeof createExportSpecifier;
};
