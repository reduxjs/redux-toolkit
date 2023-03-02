/**
 * @type {import("@rtk-query/codegen-openapi").ConfigFile}
 */
module.exports = {
  schemaFile: './fixtures/readOnlyWriteOnly.yaml',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/readOnlyWriteOnly.ts',
};
