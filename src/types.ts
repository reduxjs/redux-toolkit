import * as ts from 'typescript';
import { OpenAPIV3 } from 'openapi-types';

export type OperationDefinition = {
  path: string;
  verb: typeof operationKeys[number];
  pathItem: OpenAPIV3.PathItemObject;
  operation: OpenAPIV3.OperationObject;
};

export const operationKeys = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export type GenerationOptions = CommonOptions &
  OutputFileOptions & {
    isDataResponse?(code: string, response: OpenAPIV3.ResponseObject, allResponses: OpenAPIV3.ResponsesObject): boolean;
  };

export interface CommonOptions {
  apiFile: string;
  /**
   * filename or url
   */
  schemaFile: string;
  /**
   * defaults to "api"
   */
  apiImport?: string;
  /**
   * defaults to "enhancedApi"
   */
  exportName?: string;
  /**
   * defaults to "ApiArg"
   */
  argSuffix?: string;
  /**
   * defaults to "ApiResponse"
   */
  responseSuffix?: string;
  /**
   * defaults to false
   */
  hooks?: boolean;
}

export interface OutputFileOptions extends Partial<CommonOptions> {
  outputFile: string;
  filterEndpoints?: string | string[] | RegExp | RegExp[];
  endpointOverrides?: EndpointOverrides[];
}

export interface EndpointOverrides {
  pattern: string | string[] | RegExp | RegExp[];
  type: 'mutation' | 'query';
}

export type ConfigFile =
  | (CommonOptions & OutputFileOptions)
  | (Omit<CommonOptions, 'outputFile'> & {
      outputFiles: { [outputFile: string]: Omit<OutputFileOptions, 'outputFile'> };
    });
