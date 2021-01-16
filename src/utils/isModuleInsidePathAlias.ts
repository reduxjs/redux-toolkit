import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import globToRegExp from 'glob-to-regexp';

function isAlias(glob: string, moduleName: string): boolean {
  return globToRegExp(glob).test(moduleName);
}

const ext = ['js', 'ts'];
function existsModule(moduleName: string) {
  if (/\.(ts|js)$/.test(moduleName)) {
    return fs.existsSync(moduleName);
  }
  for (let i = 0; i < ext.length; i++) {
    if (fs.existsSync(`${moduleName}.${ext[i]}`)) {
      return true;
    }
  }
  return false;
}

export function isModuleInsidePathAlias(options: ts.CompilerOptions, moduleName: string): boolean {
  if (!(options.paths && options.baseUrl)) {
    return fs.existsSync(moduleName);
  }

  let baseUrl = options.baseUrl;
  if (!/\/$/.test(baseUrl)) {
    baseUrl = `${baseUrl}/`;
  }

  for (const glob in options.paths) {
    if (isAlias(glob, moduleName)) {
      const before = glob.replace('*', '');
      for (let i = 0; i < options.paths[glob].length; i++) {
        const after = options.paths[glob][i].replace('*', '');
        if (existsModule(path.resolve(baseUrl, after, moduleName.replace(before, '')))) {
          return true;
        }
      }
    }
  }

  return false;
}
