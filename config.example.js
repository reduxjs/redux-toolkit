/**
 * @type {import("./src/types").ConfigFile}
 */
const config = {
  schemaFile: 'https://petstore3.swagger.io/api/v3/openapi.json',
  apiFile: './api.ts',
  outputFile: 'generated.ts',
};

module.exports = config;
