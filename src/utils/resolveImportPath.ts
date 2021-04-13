import * as path from 'path';
import { stripFileExtension } from './stripFileExtension';

export function resolveImportPath(modulePath: string, containingFile: string) {
  containingFile = path.resolve(containingFile, '..');
  const strippedFile = stripFileExtension(path.relative(containingFile, modulePath));
  if (strippedFile.charAt(0) !== '.') {
    return `./${strippedFile}`;
  }
  return strippedFile;
}
