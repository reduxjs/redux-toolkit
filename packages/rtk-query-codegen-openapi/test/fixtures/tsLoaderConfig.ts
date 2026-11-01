import type { ConfigFile } from '@rtk-query/codegen-openapi';

// Enums are not supported by Node's built-in type stripping, so loading this file
// only works once a TypeScript loader is registered.
enum Files {
  Schema = './petstore.yaml',
  Api = './emptyApi.ts',
}

const config: ConfigFile = {
  schemaFile: Files.Schema,
  apiFile: Files.Api,
  outputFile: '../tmp/example.ts',
};

export default config;
