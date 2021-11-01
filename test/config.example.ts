import { ConfigFile } from '@rtk-incubator/rtk-query-codegen-openapi';

const config: ConfigFile = {
  schemaFile: 'https://petstore3.swagger.io/api/v3/openapi.json',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/example.ts',
};

export default config;
