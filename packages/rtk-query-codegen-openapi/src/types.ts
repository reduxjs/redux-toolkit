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

export interface CommonOptions {
  apiFile: string;
  /**
   * filename or url
   */
  schemaFile: string;
  /**
   * @default "api"
   */
  apiImport?: string;
  /**
   * @default "enhancedApi"
   */
  exportName?: string;
  /**
   * @default "ApiArg"
   */
  argSuffix?: string;
  /**
   * @default "ApiResponse"
   */
  responseSuffix?: string;
  /**
   * @default ""
   */
  operationNameSuffix?: string;
  /**
   * Controls how OpenAPI **`operationId`** values are transformed into
   * endpoint names.
   * @see {@linkcode OperationIdTransformer} for details.
   *
   * @default "camelCase"
   * @since 2.3.0
   */
  operationIdTransformer?: OperationIdTransformer;
  /**
   * `true` will generate hooks for queries and mutations, but no lazyQueries
   * @default false
   */
  hooks?: boolean | { queries: boolean; lazyQueries: boolean; mutations: boolean };
  /**
   * `true` will generate a union type for `undefined` properties like: `{ id?: string | undefined }` instead of `{ id?: string }`
   * @default false
   */
  unionUndefined?: boolean;
  /**
   * `true` will result in all generated endpoints having `providesTags`/`invalidatesTags` declarations for the `tags` of their respective operation definition
   * @default false
   * @see https://redux-toolkit.js.org/rtk-query/usage/code-generation for more information
   */
  tag?: boolean;
  /**
   * `true` will add `encodeURIComponent` to the generated path parameters
   * @default false
   */
  encodePathParams?: boolean;
  /**
   * `true` will add `encodeURIComponent` to the generated query parameters
   * @default false
   */
  encodeQueryParams?: boolean;
  /**
   * `true` will "flatten" the arg so that you can do things like `useGetEntityById(1)` instead of `useGetEntityById({ entityId: 1 })`
   * @default false
   */
  flattenArg?: boolean;
  /**
   * If set to `true`, the default response type will be included in the generated code for all endpoints.
   * @default false
   * @see https://swagger.io/docs/specification/describing-responses/#default
   */
  includeDefault?: boolean;
  /**
   * `true` will not generate separate types for read-only and write-only properties.
   * @default false
   */
  mergeReadWriteOnly?: boolean;
  /**
   * HTTPResolverOptions object that is passed to the SwaggerParser bundle function.
   */
  httpResolverOptions?: SwaggerParser.HTTPResolverOptions;

  /**
   * If present the given file will be used as prettier config when formatting the generated code. If undefined the default prettier config
   * resolution mechanism will be used.
   * @default undefined
   */
  prettierConfigFile?: string;

  /**
   * Determines the fallback type for empty schemas.
   *
   * If set to **`true`**, **`unknown`** will be used
   * instead of **`any`** when a schema is empty.
   *
   * @default false
   * @since 2.1.0
   */
  useUnknown?: boolean;
  /**
   * @default false
   * Will generate imports with file extension matching the expected compiled output of the api file
   */
  esmExtensions?: boolean;
  /**
   * @default false
   * Will generate regex constants for pattern keywords in the schema
   */
  outputRegexConstants?: boolean;
}

/**
 * Controls how OpenAPI **`operationId`** values are transformed
 * into endpoint names.
 *
 * - **`"camelCase"`** *(default)* — applies lodash **`camelCase`** via **`oazapfts`** (current behavior)
 * - **`"none"`** — uses the raw **`operationId`** string verbatim with no transformation
 * - **`(operationId: string) => string`** — applies a custom function to each **`operationId`**
 *
 * When using **`"none"`** or a custom function every operation **must**
 * have an **`operationId`** defined in the OpenAPI schema, otherwise
 * an {@linkcode Error | Error} is thrown during generation.
 *
 * @example
 * <caption>Preserve exact casing (e.g. `fetchMyJWTPlease` stays `fetchMyJWTPlease`)</caption>
 *
 * ```ts
 * operationIdTransformer: 'none'
 * ```
 *
 * @example
 * <caption>Custom transformer</caption>
 *
 * ```ts
 * operationIdTransformer: (id) => id.replace(/^get/, 'fetch')
 * ```
 *
 * @since 2.3.0
 * @public
 */
export type OperationIdTransformer = 'camelCase' | 'none' | ((operationId: string) => string);

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
   * If passed as true it will generate TS enums instead of union of strings
   * @default false
   */
  useEnumType?: boolean;
}

/**
 * Configuration for overriding specific endpoint behaviors during code generation.
 * At least one override option (besides `pattern`) must be specified.
 */
export type EndpointOverrides = {
  /** Pattern to match endpoint names. Can be a string, RegExp, or matcher function. */
  pattern: EndpointMatcher;
} & AtLeastOneKey<{
  /** Override the endpoint type (query vs mutation) when the inferred type is incorrect. */
  type: 'mutation' | 'query';
  /** Filter which parameters are included in the generated endpoint. Path parameters cannot be filtered. */
  parameterFilter: ParameterMatcher;
  /**
   * Override providesTags for this endpoint.
   * Takes precedence over auto-generated tags from OpenAPI spec.
   * Use an empty array to explicitly omit providesTags.
   * Works regardless of the global `tag` setting and endpoint type.
   * @example ['Pet', 'SinglePet']
   */
  providesTags: string[];
  /**
   * Override invalidatesTags for this endpoint.
   * Takes precedence over auto-generated tags from OpenAPI spec.
   * Use an empty array to explicitly omit invalidatesTags.
   * Works regardless of the global `tag` setting and endpoint type.
   * @example ['Pet', 'PetList']
   */
  invalidatesTags: string[];
}>;

export type ConfigFile =
  | Id<Require<CommonOptions & OutputFileOptions, 'outputFile'>>
  | Id<
      Omit<CommonOptions, 'outputFile'> & {
        outputFiles: { [outputFile: string]: Omit<OutputFileOptions, 'outputFile'> };
      }
    >;
