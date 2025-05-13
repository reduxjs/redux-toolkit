import type SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';

export type OperationDefinition = {
  path: string;
  verb: (typeof operationKeys)[number];
  pathItem: OpenAPIV3.PathItemObject;
  operation: OpenAPIV3.OperationObject;
};

export type ParameterDefinition = OpenAPIV3.ParameterObject;

type Require<T, K extends keyof T> = { [k in K]-?: NonNullable<T[k]> } & Omit<T, K>;
type Optional<T, K extends keyof T> = { [k in K]?: NonNullable<T[k]> } & Omit<T, K>;
type Id<T> = { [K in keyof T]: T[K] } & {};
type AtLeastOneKey<T> = {
  [K in keyof T]-?: Pick<T, K> & Partial<T>;
}[keyof T];

export const operationKeys = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export type GenerationOptions = Id<
  CommonOptions &
    Optional<OutputFileOptions, 'outputFile'> & {
      isDataResponse?(
        code: string,
        includeDefault: boolean,
        response: OpenAPIV3.ResponseObject,
        allResponses: OpenAPIV3.ResponsesObject
      ): boolean;
    }
>;

export type UuidHandlingOptions = {
  typeName: string;
  importfile: string;
}

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
   * defaults to empty
   */
  operationNameSuffix?: string;
  /**
   * defaults to `false`
   * `true` will generate hooks for queries and mutations, but no lazyQueries
   */
  hooks?: boolean | { queries: boolean; lazyQueries: boolean; mutations: boolean };
  /**
   * defaults to false
   * `true` will generate a union type for `undefined` properties like: `{ id?: string | undefined }` instead of `{ id?: string }`
   */
  unionUndefined?: boolean;
  /**
   * defaults to false
   * `true` will result in all generated endpoints having `providesTags`/`invalidatesTags` declarations for the `tags` of their respective operation definition
   * @see https://redux-toolkit.js.org/rtk-query/usage/code-generation for more information
   */
  tag?: boolean;
  /**
   * defaults to false
   * `true` will add `encodeURIComponent` to the generated path parameters
   */
  encodePathParams?: boolean;
  /**
   * defaults to false
   * `true` will add `encodeURIComponent` to the generated query parameters
   */
  encodeQueryParams?: boolean;
  /**
   * defaults to false
   * `true` will "flatten" the arg so that you can do things like `useGetEntityById(1)` instead of `useGetEntityById({ entityId: 1 })`
   */
  flattenArg?: boolean;
  /**
   * default to false
   * If set to `true`, the default response type will be included in the generated code for all endpoints.
   * @see https://swagger.io/docs/specification/describing-responses/#default
   */
  includeDefault?: boolean;
  /**
   * default to false
   * `true` will not generate separate types for read-only and write-only properties.
   */
  mergeReadWriteOnly?: boolean;
  /**
   *
   * HTTPResolverOptions object that is passed to the SwaggerParser bundle function.
   */
  httpResolverOptions?: SwaggerParser.HTTPResolverOptions;

  /**
   * defaults to undefined
   * If present the given file will be used as prettier config when formatting the generated code. If undefined the default prettier config
   * resolution mechanism will be used.
   */
  prettierConfigFile?: string;

  uuidHandling: UuidHandlingOptions | null;
  requireAllProperties: boolean;
}

export type TextMatcher = string | RegExp | (string | RegExp)[];

export type EndpointMatcherFunction = (operationName: string, operationDefinition: OperationDefinition) => boolean;

export type EndpointMatcher = TextMatcher | EndpointMatcherFunction;

export type ParameterMatcherFunction = (parameterName: string, parameterDefinition: ParameterDefinition) => boolean;

export type ParameterMatcher = TextMatcher | ParameterMatcherFunction;

export interface OutputFileOptions extends Partial<CommonOptions> {
  outputFile: string;
  filterEndpoints?: EndpointMatcher;
  endpointOverrides?: EndpointOverrides[];
  /**
   * defaults to false
   * If passed as true it will generate TS enums instead of union of strings
   */
  useEnumType?: boolean;
}

export type EndpointOverrides = {
  pattern: EndpointMatcher;
} & AtLeastOneKey<{
  type: 'mutation' | 'query';
  parameterFilter: ParameterMatcher;
}>;

export type ConfigFile =
  | Id<Require<CommonOptions & OutputFileOptions, 'outputFile'>>
  | Id<
      Omit<CommonOptions, 'outputFile'> & {
        outputFiles: { [outputFile: string]: Omit<OutputFileOptions, 'outputFile'> };
      }
    >;
