import path from 'path';
import fs from 'fs';
import { CommonOptions, OutputFileOptions } from './types';
import { generateApi } from './generate';
import { isValidUrl, prettify } from './utils';
export { ConfigFile } from './types';

export type GenerateEndpointsOptions = CommonOptions & OutputFileOptions;

export async function generateEndpoints(options: GenerateEndpointsOptions): Promise<string | void> {
  const schemaLocation = options.schemaFile;

  const schemaAbsPath = isValidUrl(options.schemaFile)
    ? options.schemaFile
    : path.resolve(process.cwd(), schemaLocation);

  try {
    const sourceCode = await generateApi(schemaAbsPath, options);
    const outputFile = options.outputFile;
    if (outputFile !== '-') {
      fs.writeFileSync(path.resolve(process.cwd(), outputFile), await prettify(outputFile, sourceCode));
    } else {
      return await prettify(null, sourceCode);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
