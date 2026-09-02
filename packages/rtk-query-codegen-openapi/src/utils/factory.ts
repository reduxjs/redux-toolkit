import ts from 'typescript';
import semver from 'semver';

/**
 * The unwrapped TypeScript node factory the overrides below delegate to.
 *
 * @internal
 */
const originalFactory = ts.factory;

/**
 * Creates an import specifier, i.e. one `name` or `propertyName as name`
 * entry of an import clause.
 *
 * TypeScript 4.5 added a leading `isTypeOnly` argument to this factory
 * method, so the call is dispatched on the TypeScript version actually
 * loaded at runtime rather than the one this package was compiled
 * against.
 *
 * @param propertyName - The name being imported, or `undefined` when no alias is used.
 * @param name - The local name the import is bound to.
 * @returns The import specifier node.
 *
 * @internal
 */
function createImportSpecifier(propertyName: ts.Identifier | undefined, name: ts.Identifier): ts.ImportSpecifier {
  if (semver.satisfies(ts.version, '>= 4.5'))
    // @ts-ignore
    return originalFactory.createImportSpecifier(false, propertyName, name);
  // @ts-ignore
  return originalFactory.createImportSpecifier(propertyName, name);
}

/**
 * Creates an export specifier, i.e. one `name` or `propertyName as name`
 * entry of an export clause.
 *
 * Dispatches on the loaded TypeScript version for the same reason as
 * {@linkcode createImportSpecifier()}.
 *
 * @param propertyName - The name being exported, or `undefined` when no alias is used.
 * @param name - The name the export is exposed under.
 * @returns The export specifier node.
 *
 * @internal
 */
function createExportSpecifier(
  propertyName: string | ts.Identifier | undefined,
  name: string | ts.Identifier
): ts.ExportSpecifier {
  if (semver.satisfies(ts.version, '>= 4.5'))
    // @ts-ignore
    return originalFactory.createExportSpecifier(false, propertyName, name);
  // @ts-ignore
  return originalFactory.createExportSpecifier(propertyName, name);
}

/**
 * The TypeScript node factory used throughout code generation - the
 * built-in one, with the two specifier methods replaced by
 * version-tolerant wrappers.
 *
 * @since 1.0.0
 * @public
 */
export const factory = {
  ...originalFactory,
  createImportSpecifier,
  createExportSpecifier,
};
