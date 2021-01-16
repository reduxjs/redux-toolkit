import * as ts from 'typescript';
import * as fs from 'fs';

import { MESSAGES, stripFileExtension } from '../utils';
import { isModuleInsidePathAlias } from '../utils/isModuleInsidePathAlias';
import { generateImportNode } from './import-node';
import { fnExportExists } from '../utils/fnExportExists';
import { resolveImportPath } from '../utils/resolveImportPath';

type SmartGenerateImportNode = {
  moduleName: string;
  containingFile?: string;
  targetName: string;
  targetAlias: string;
  compilerOptions?: ts.CompilerOptions;
};
export const generateSmartImportNode = ({
  moduleName,
  containingFile,
  targetName,
  targetAlias,
  compilerOptions,
}: SmartGenerateImportNode): ts.ImportDeclaration => {
  if (fs.existsSync(moduleName)) {
    if (fnExportExists(moduleName, targetName)) {
      return generateImportNode(
        stripFileExtension(containingFile ? resolveImportPath(moduleName, containingFile) : moduleName),
        {
          [targetName]: targetAlias,
        }
      );
    }

    if (targetName === 'default') {
      throw new Error(MESSAGES.DEFAULT_EXPORT_MISSING);
    }
    throw new Error(MESSAGES.NAMED_EXPORT_MISSING);
  }

  if (!compilerOptions) {
    throw new Error(MESSAGES.FILE_NOT_FOUND);
  }

  // maybe moduleName is path alias
  if (isModuleInsidePathAlias(compilerOptions, moduleName)) {
    return generateImportNode(stripFileExtension(moduleName), {
      [targetName]: targetAlias,
    });
  }

  throw new Error(MESSAGES.FILE_NOT_FOUND);
};
