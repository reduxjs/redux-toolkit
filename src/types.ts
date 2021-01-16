import * as ts from 'typescript';
import { OpenAPIV3 } from 'openapi-types';

export type OperationDefinition = {
  path: string;
  verb: typeof operationKeys[number];
  pathItem: OpenAPIV3.PathItemObject;
  operation: OpenAPIV3.OperationObject;
};

export const operationKeys = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export type GenerationOptions = {
  exportName?: string;
  reducerPath?: string;
  baseQuery?: string;
  argSuffix?: string;
  responseSuffix?: string;
  baseUrl?: string;
  hooks?: boolean;
  outputFile?: string;
  compilerOptions?: ts.CompilerOptions;
  isDataResponse?(code: string, response: OpenAPIV3.ResponseObject, allResponses: OpenAPIV3.ResponsesObject): boolean;
};
