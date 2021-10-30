/**
 * @type {import("@rtk-incubator/rtk-query-codegen-openapi").ConfigFile}
 */
module.exports = {
  schemaFile: 'https://petstore3.swagger.io/api/v3/openapi.json',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/example.ts',
};
