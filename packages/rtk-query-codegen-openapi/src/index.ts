import path from 'path';
import fs from 'fs';
import ts from 'typescript';
import type { CommonOptions, ConfigFile, GenerationOptions, OutputFileOptions } from './types';
import { generateApi } from './generate';
import { isValidUrl, prettify } from './utils';
export { ConfigFile } from './types';

export async function generateEndpoints(options: GenerationOptions): Promise<string | void> {
  assertCompatibleTsVersions();

  const schemaLocation = options.schemaFile;

  const schemaAbsPath = isValidUrl(options.schemaFile)
    ? options.schemaFile
    : path.resolve(process.cwd(), schemaLocation);

  const sourceCode = await generateApi(schemaAbsPath, options);
  const outputFile = options.outputFile;
  if (outputFile) {
    fs.writeFileSync(path.resolve(process.cwd(), outputFile), await prettify(outputFile, sourceCode));
  } else {
    return await prettify(null, sourceCode);
  }
}

export function parseConfig(fullConfig: ConfigFile) {
  const outFiles: (CommonOptions & OutputFileOptions)[] = [];

  if ('outputFiles' in fullConfig) {
    const { outputFiles, ...commonConfig } = fullConfig;
    for (const [outputFile, specificConfig] of Object.entries(outputFiles)) {
      outFiles.push({
        ...commonConfig,
        ...specificConfig,
        outputFile,
      });
    }
  } else {
    outFiles.push(fullConfig);
  }
  return outFiles;
}

function assertCompatibleTsVersions() {
  const oazapftsTsVersion = require(require.resolve('typescript', { paths: [require.resolve('oazapfts')] })).version;
  if (oazapftsTsVersion !== ts.version) {
    throw new Error(
      `TypeScript versions available to the \`@rtk-query/codegen-openapi\` package (${ts.version}) and the \`oazapfts\` package (${oazapftsTsVersion}) differ.
      This makes code generation impossible.
      This is a problem with your local node_modules installation and can be resolved with a "resolutions" field in your package.json if you are using  \`yarn\`.
      Otherwise, use a tool like \`mock-require\` to ensure all imports of TypeScript will result in the same package version.`
    );
  }
}
