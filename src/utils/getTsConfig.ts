import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';

function readConfig(configPath: string): ts.ParsedCommandLine | undefined {
  const result = ts.readConfigFile(configPath, ts.sys.readFile);

  if (result.error) {
    return undefined;
  }

  return ts.parseJsonConfigFileContent(result.config, ts.sys, path.dirname(configPath), undefined, configPath);
}

function findConfig(baseDir: string): string | undefined {
  const configFileName = 'tsconfig.json';

  function loop(dir: string): string | undefined {
    const parentPath = path.dirname(dir);
    // It is root directory if parent and current dirname are the same
    if (dir === parentPath) {
      return undefined;
    }

    const configPath = path.join(dir, configFileName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    return loop(parentPath);
  }
  return loop(baseDir);
}

export function getCompilerOptions(configPath?: string): ts.CompilerOptions | undefined {
  if (!configPath) {
    configPath = findConfig(process.cwd());
  }

  if (!configPath) {
    return;
  }

  const config = readConfig(configPath);

  if (config) {
    return config.options;
  }
}
