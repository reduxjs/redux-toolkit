import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export function fnExportExists(filePath: string, fnName: string) {
  const fileName = path.resolve(process.cwd(), filePath);

  const sourceFile = ts.createSourceFile(
    fileName,
    fs.readFileSync(fileName).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );

  let found = false;

  ts.forEachChild(sourceFile, (node) => {
    const text = node.getText();
    if (ts.isExportAssignment(node)) {
      if (text.includes(fnName)) {
        found = true;
      }
    } else if (ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isExportDeclaration(node)) {
      if (text.includes(fnName) && text.includes('export')) {
        found = true;
      }
    } else if (ts.isExportAssignment(node)) {
      if (text.includes(`export ${fnName}`)) {
        found = true;
      }
    }
  });

  return found;
}
