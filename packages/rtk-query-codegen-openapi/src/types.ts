import type SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';

export type OperationDefinition = {
  /**
   * The path of the API endpoint (e.g., "/users/{id}").
   */
  path: string;

  /**
   * The HTTP verb/method used for the operation
   * (e.g., "get", "post").
   */
  verb: (typeof operationKeys)[number];

  /**
   * The OpenAPI `PathItemObject` associated with the operation.
   */
  pathItem: OpenAPIV3.PathItemObject;

  /**
   * The OpenAPI `OperationObject` defining the operation.
   */
  operation: OpenAPIV3.OperationObject;
};

export type ParameterDefinition = OpenAPIV3.ParameterObject;

type Require<T, K extends keyof T> = { [k in K]-?: NonNullable<T[k]> } & Omit<T, K>;
type Optional<T, K extends keyof T> = { [k in K]?: NonNullable<T[k]> } & Omit<T, K>;
type Id<T> = T extends (...args: any[]) => any ? T : { [K in keyof T]: T[K] } & {};
type AtLeastOneKey<T> = {
  [K in keyof T]-?: Pick<T, K> & Partial<T>;
}[keyof T];

export const operationKeys = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export type GenerationOptions = Id<
  CommonOptions &
    Optional<OutputFileOptions, 'outputFile'> & {
      /**
       * Function to determine if a response is considered a "data" response.
       *
       * @param code - The HTTP status code as a string.
       * @param includeDefault - Whether the default response is included.
       * @param response - The OpenAPI response object for the given status code.
       * @param allResponses - All responses defined for the operation.
       * @returns `true` if the response is a data response, `false` otherwise.
       */
      isDataResponse?(
        code: string,
        includeDefault: boolean,
        response: OpenAPIV3.ResponseObject,
        allResponses: OpenAPIV3.ResponsesObject
      ): boolean;
    }
>;

export type CommonOptions = {
  /**
   * filename of the api file to import base api from.
   */
  apiFile: string;

  /**
   * The OpenAPI schema filename or URL to generate the API from.
   */
  schemaFile: string;

  /**
   * The name to use for the imported API instance.
   *
   * @default "api"
   */
  apiImport?: string;

  /**
   * The name to use for the generated API instance.
   *
   * @default "enhancedApi"
   */
  exportName?: string;

  /**
   * A suffix to append to generated argument type names.
   *
   * @default "ApiArg"
   */
  argSuffix?: string;

  /**
   * A suffix to append to generated response type names.
   *
   * @default "ApiResponse"
   */
  responseSuffix?: string;

  /**
   * A suffix to append to generated operation names.
   *
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
   * An object can be provided to configure which hooks to generate.
   * - **`true`:** will generate hooks for `queries` and `mutations`, but no
   *   `lazyQueries`. Equivalent to:
   *   ```ts
   *   {
   *     lazyQueries: false,
   *     mutations: true,
   *     queries: true,
   *   };
   *   ```
   * - **`false` (Default):** will not generate any hooks. Equivalent to:
   *   ```ts
   *   {
   *     lazyQueries: false,
   *     mutations: false,
   *     queries: false,
   *   };
   *   ```
   *
   * @default false
   */
  hooks?:
    | boolean
    | {
        lazyQueries: boolean;
        mutations: boolean;
        queries: boolean;
      };

  /**
   * `true` will generate a union type for `undefined` properties like:
   * `{ id?: string | undefined }` instead of `{ id?: string }`
   *
   * @example
   *
   * ```diff
   * {
   * -  id?: string
   * +  id?: string | undefined
   * }
   * ```
   *
   * @default false
   */
  unionUndefined?: boolean;

  /**
   * `true` will result in all generated endpoints having
   * {@linkcode EndpointOverrides.providesTags | providesTags}
   * and {@linkcode EndpointOverrides.invalidatesTags | invalidatesTags}
   * declarations for the `tags` of their respective operation definition.
   *
   * @default false
   * @see {@link https://redux-toolkit.js.org/rtk-query/usage/code-generation | code-generation docs} for more information
   */
  tag?: boolean;

  /**
   * `true` will add {@linkcode encodeURIComponent} to the generated
   * {@linkcode OpenAPIV3.PathItemObject.parameters | Path parameters}.
   *
   * @default false
   */
  encodePathParams?: boolean;

  /**
   * `true` will add {@linkcode encodeURIComponent} to the generated
   * {@linkcode OpenAPIV3.OperationObject.parameters | query parameters}.
   *
   * @default false
   */
  encodeQueryParams?: boolean;

  /**
   * `true` will "flatten" the arg so that you can do things like
   * `useGetEntityById(1)` instead of `useGetEntityById({ entityId: 1 })`.
   *
   * @example
   *
   * ```diff
   * - useGetEntityById({ entityId: 1 })
   * + useGetEntityById(1)
   * ```
   *
   * @default false
   */
  flattenArg?: boolean;

  /**
   * If set to `true`, the default response type will be included in
   * the generated code for all endpoints.
   *
   * @default false
   * @see {@link https://swagger.io/docs/specification/describing-responses/#default | docs}
   */
  includeDefault?: boolean;

  /**
   * `true` will not generate separate types for
   * {@link https://swagger.io/docs/specification/v3_0/data-models/data-types/#read-only-and-write-only-properties | read-only and write-only properties}.
   *
   * @default false
   */
  mergeReadWriteOnly?: boolean;

  /**
   * {@linkcode SwaggerParser.HTTPResolverOptions | HTTPResolverOptions}
   * object that is passed to the
   * {@linkcode SwaggerParser.bundle | SwaggerParser bundle} function.
   */
  httpResolverOptions?: SwaggerParser.HTTPResolverOptions;

  /**
   * If present the given file will be used as prettier config when formatting
   * the generated code. If `undefined` the default prettier config resolution
   * mechanism will be used.
   *
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
   * Will generate imports with file extension matching the expected compiled
   * output of the {@linkcode  CommonOptions.apiFile | api file}.
   *
   * @default false
   */
  esmExtensions?: boolean;

  /**
   * Will generate regex constants for
   * {@linkcode OpenAPIV3.BaseSchemaObject.pattern | pattern}
   * keywords in the schema.
   *
   * @default false
   */
  outputRegexConstants?: boolean;

  /**
   * If set to `true`, all schemas from the OpenAPI document will be exported,
   * regardless of whether they are referenced by any endpoint definitions.
   *
   * @default false
   */
  exportAllSchemas?: boolean;
};

/**
 * Controls how OpenAPI **`operationId`** values are transformed into
 * endpoint names.
 *
 * - **`"camelCase"`** *(default)* - applies lodash **`camelCase`** via **`oazapfts`** (current behavior)
 * - **`"none"`** - uses the raw **`operationId`** string verbatim with no transformation
 * - **`(operationId: string) => string`** - applies a custom function to each **`operationId`**
 *
 * When using **`"none"`** or a custom function every operation **must**
 * have an **`operationId`** defined in the OpenAPI schema, otherwise
 * an {@linkcode Error} is thrown during generation.
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

export type EndpointMatcherFunction = Id<(operationName: string, operationDefinition: OperationDefinition) => boolean>;

export type EndpointMatcher = TextMatcher | EndpointMatcherFunction;

export type ParameterMatcherFunction = (parameterName: string, parameterDefinition: ParameterDefinition) => boolean;

export type ParameterMatcher = TextMatcher | ParameterMatcherFunction;

/**
 * Controls how enums are generated in TypeScript.
 *
 * - **`"union"`** *(default)* - a union of string literals: `type Status = "available" | "pending"`
 * - **`"enum"`** - a TypeScript enum: `enum Status { Available = "available" }`
 * - **`"as-const"`** - a const object with a companion type:
 *   `const Status = { Available: "available" } as const; type Status = (typeof Status)[keyof typeof Status];`
 *
 * @since 2.3.0
 * @public
 */
export type EnumStyle = 'union' | 'enum' | 'as-const';

export type OutputFileOptions = Id<
  Partial<CommonOptions> & {
    /**
     * The output file path for the generated code.
     */
    outputFile: string;

    /**
     * Filters which endpoints will be generated in this output file.
     */
    filterEndpoints?: EndpointMatcher;

    /**
     * Configuration for overriding specific endpoint behaviors during
     * code generation.
     */
    endpointOverrides?: EndpointOverrides[];

    /**
     * If passed as true it will generate
     * {@link https://www.typescriptlang.org/docs/handbook/enums.html | TypeScript Enums}
     * instead of
     * {@link https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#unions | union}
     * of strings.
     *
     * @default false
     */
    useEnumType?: boolean;

    /**
     * Controls how enums are generated in TypeScript.
     * Takes precedence over `useEnumType` if both are specified.
     * @see {@linkcode EnumStyle} for details.
     *
     * @default "union"
     * @since 2.3.0
     */
    enumStyle?: EnumStyle;
  }
>;

/**
 * Configuration for overriding specific endpoint behaviors during
 * code generation. At least one override option
 * (besides {@linkcode EndpointOverrides.pattern | pattern}) must be specified.
 */
export type EndpointOverrides = Id<
  {
    /**
     * Pattern to match endpoint names.
     * Can be a `string`, {@linkcode RegExp}, or
     * {@linkcode EndpointMatcherFunction | matcher function}.
     */
    pattern: EndpointMatcher;
  } & AtLeastOneKey<{
    /**
     * Override the endpoint type (`query` vs `mutation`) when the
     * inferred type is incorrect.
     */
    type: 'mutation' | 'query';

    /**
     * Filter which parameters are included in the generated endpoint.
     * {@linkcode OpenAPIV3.PathItemObject.parameters | Path parameters}
     * cannot be filtered.
     */
    parameterFilter: ParameterMatcher;

    /**
     * Override `providesTags` for this endpoint.
     * Takes precedence over auto-generated tags from OpenAPI spec.
     * Use an empty array to explicitly omit `providesTags`.
     * Works regardless of the global `tag` setting and endpoint `type`.
     *
     * @example
     *
     * ```ts
     * ['Pet', 'SinglePet']
     * ```
     */
    providesTags: string[];

    /**
     * Override `invalidatesTags` for this endpoint.
     * Takes precedence over auto-generated tags from OpenAPI spec.
     * Use an empty array to explicitly omit `invalidatesTags`.
     * Works regardless of the global `tag` setting and endpoint `type`.
     *
     * @example
     *
     * ```ts
     * ['Pet', 'PetList']
     * ```
     */
    invalidatesTags: string[];
  }>
>;

export type ConfigFile =
  | Id<Require<CommonOptions & OutputFileOptions, 'outputFile'>>
  | Id<
      CommonOptions & {
        /**
         * Mapping of output file paths to their respective output file options.
         */
        outputFiles: { [outputFile: string]: Id<Omit<OutputFileOptions, 'outputFile'>> };
      }
    >;
