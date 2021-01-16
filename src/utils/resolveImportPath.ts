import * as path from 'path';
import { stripFileExtension } from './stripFileExtension';

export function resolveImportPath(modulePath: string, containingFile: string) {
  containingFile = path.resolve(containingFile, '..');
  return stripFileExtension(path.relative(containingFile, modulePath));
}
