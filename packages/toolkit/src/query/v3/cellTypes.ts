/**
 * RTK Query v3 prototype: flattened endpoint cell input types.
 *
 * These are a v3-owned re-statement of the option surface described by
 * `QueryDefinition` / `MutationDefinition` / `InfiniteQueryDefinition`,
 * restructured for check-time performance:
 *
 * - The current definition types are deep intersection towers
 *   (`BaseEndpointDefinition & ...ExtraOptions`, with a conditional
 *   `HasRequiredProps` arm and a union folded inside the intersection).
 *   Intersections are re-normalized into fresh anonymous types on every
 *   checking pass, and the reverse-mapped `createApi` inference checks the
 *   endpoints literal roughly three times (inference pass, contextual pass,
 *   final assignability).
 * - A generic *interface* instantiation is cached by (symbol, type args), so
 *   repeated checks against the same instantiation are cache hits, and its
 *   members are resolved lazily.
 *
 * Semantics are intended to match the current definition types, with two
 * deliberate simplifications, both to avoid conditional types in the tower:
 * - `extraOptions` is always optional (the current types make it *required*
 *   when the base query declares required extra options via
 *   `HasRequiredProps`).
 * - The phantom symbol members and the `Types` phantom bag are omitted from
 *   the *input* side; the output side (`ToDefinitions`) still produces real
 *   `QueryDefinition` etc., which carry them.
 */
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type {
  BaseQueryApi,
  BaseQueryArg,
  BaseQueryError,
  BaseQueryExtraOptions,
  BaseQueryFn,
  BaseQueryMeta,
  BaseQueryResult,
  QueryReturnValue,
} from '../baseQueryTypes'
import type { CacheCollectionQueryExtraOptions } from '../core/buildMiddleware/cacheCollection'
import type {
  CacheLifecycleInfiniteQueryExtraOptions,
  CacheLifecycleMutationExtraOptions,
  CacheLifecycleQueryExtraOptions,
} from '../core/buildMiddleware/cacheLifecycle'
import type {
  QueryLifecycleInfiniteQueryExtraOptions,
  QueryLifecycleMutationExtraOptions,
  QueryLifecycleQueryExtraOptions,
} from '../core/buildMiddleware/queryLifecycle'
import type {
  InfiniteData,
  InfiniteQueryConfigOptions,
  QuerySubState,
  RootState,
} from '../core/index'
import type { SerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type {
  DefinitionType,
  InfiniteQueryCombinedArg,
  ResultDescription,
  SchemaFailureConverter,
  SchemaFailureHandler,
  SchemaType,
} from '../endpointDefinitions'
import type { NEVER } from '../fakeBaseQuery'
import type { CastAny, MaybePromise } from '../tsHelpers'

/**
 * The options shared by all endpoint kinds (mirrors
 * `CommonEndpointDefinition` plus the always-optional `extraOptions`).
 */
export interface CellCommonOptions<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
> {
  /** A schema for the arguments to be passed to the `request` or `queryFn`. */
  argSchema?: StandardSchemaV1<QueryArg>
  /** A schema for the result (including `transformResponse` if provided). */
  responseSchema?: StandardSchemaV1<ResultType>
  /** A schema for the error object (including `transformErrorResponse` if provided). */
  errorResponseSchema?: StandardSchemaV1<BaseQueryError<BaseQuery>>
  /** A schema for the `meta` property returned by the `request` or `queryFn`. */
  metaSchema?: StandardSchemaV1<BaseQueryMeta<BaseQuery>>
  /** Defaults to `true`. Set to `false` to disable structural sharing on cache updates. */
  structuralSharing?: boolean
  /** A function that is called when a schema validation fails. */
  onSchemaFailure?: SchemaFailureHandler
  /** Convert a schema validation failure into an error shape matching base query errors. */
  catchSchemaFailure?: SchemaFailureConverter<BaseQuery>
  /** If set to `true`, will skip schema validation for this endpoint. */
  skipSchemaValidation?: boolean | SchemaType[]
  /** Extra options passed through to the base query. */
  extraOptions?: BaseQueryExtraOptions<BaseQuery>
}

/** The `query`-flavored fetch surface (mirrors `EndpointDefinitionWithQuery`). */
export interface CellWithQuery<
  QueryArg,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
> {
  /**
   * A function that builds the base query argument (e.g. a URL string or
   * `FetchArgs` object) for this endpoint. Named `query` in RTK Query 2.x;
   * renamed to avoid colliding with the `query()` endpoint creator.
   */
  request(arg: QueryArg): BaseQueryArg<BaseQuery>
  queryFn?: never
  /** A function to manipulate the data returned by a query or mutation. */
  transformResponse?(
    baseQueryReturnValue: RawResultType,
    meta: BaseQueryMeta<BaseQuery>,
    arg: QueryArg,
  ): ResultType | Promise<ResultType>
  /** A function to manipulate the data returned by a failed query or mutation. */
  transformErrorResponse?(
    baseQueryReturnValue: BaseQueryError<BaseQuery>,
    meta: BaseQueryMeta<BaseQuery>,
    arg: QueryArg,
  ): unknown
  /** A schema for the result *before* it's passed to `transformResponse`. */
  rawResponseSchema?: StandardSchemaV1<RawResultType>
  /** A schema for the error object *before* it's passed to `transformErrorResponse`. */
  rawErrorResponseSchema?: StandardSchemaV1<BaseQueryError<BaseQuery>>
}

/** The `queryFn`-flavored fetch surface (mirrors `EndpointDefinitionWithQueryFn`). */
export interface CellWithQueryFn<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
> {
  queryFn(
    arg: QueryArg,
    api: BaseQueryApi,
    extraOptions: BaseQueryExtraOptions<BaseQuery>,
    baseQuery: (arg: Parameters<BaseQuery>[0]) => ReturnType<BaseQuery>,
  ): MaybePromise<
    QueryReturnValue<
      ResultType,
      BaseQueryError<BaseQuery>,
      BaseQueryMeta<BaseQuery>
    >
  >
  request?: never
  transformResponse?: never
  transformErrorResponse?: never
  rawResponseSchema?: never
  rawErrorResponseSchema?: never
}

/** Query-kind options (mirrors `QueryExtraOptions` plus the v3 `upsert`). */
export interface QueryCellOptions<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  UpsertEntry,
> extends CellCommonOptions<QueryArg, ResultType, BaseQuery>,
    CacheCollectionQueryExtraOptions,
    CacheLifecycleQueryExtraOptions<
      ResultType,
      QueryArg,
      BaseQuery,
      ReducerPath
    >,
    QueryLifecycleQueryExtraOptions<
      ResultType,
      QueryArg,
      BaseQuery,
      ReducerPath
    > {
  type: DefinitionType.query
  /** Determines which 'tag' is attached to the cached data returned by the query. */
  providesTags?: ResultDescription<
    TagTypes,
    ResultType,
    QueryArg,
    BaseQueryError<BaseQuery>,
    BaseQueryMeta<BaseQuery>
  >
  /** Not to be used. A query should not invalidate tags in the cache. */
  invalidatesTags?: never
  /** Can be provided to return a custom cache key value based on the query arguments. */
  serializeQueryArgs?: SerializeQueryArgs<
    QueryArg,
    string | number | boolean | Record<any, any>
  >
  /** Can be provided to merge an incoming response value into the current cache data. */
  merge?(
    currentCacheData: ResultType,
    responseData: ResultType,
    otherArgs: {
      arg: QueryArg
      baseQueryMeta: BaseQueryMeta<BaseQuery>
      requestId: string
      fulfilledTimeStamp: number
    },
  ): ResultType | void
  /** Check to see if the endpoint should force a refetch in cases where it normally wouldn't. */
  forceRefetch?(params: {
    currentArg: QueryArg | undefined
    previousArg: QueryArg | undefined
    state: RootState<any, any, string>
    endpointState?: QuerySubState<any>
  }): boolean
  /**
   * Derives cache upserts for other query endpoints from this endpoint's
   * result. Runs after a fulfilled fetch; the returned entries are written
   * via `api.util.upsertQueryEntries`.
   */
  upsert?(
    result: ResultType,
    arg: QueryArg,
  ): ReadonlyArray<UpsertEntry>
}

export interface QueryCellVariantWithQuery<
  QueryArg,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  UpsertEntry,
> extends CellWithQuery<QueryArg, ResultType, RawResultType, BaseQuery>,
    QueryCellOptions<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath,
      UpsertEntry
    > {}

export interface QueryCellVariantWithQueryFn<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  UpsertEntry,
> extends CellWithQueryFn<QueryArg, ResultType, BaseQuery>,
    QueryCellOptions<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath,
      UpsertEntry
    > {}

export type QueryCell<
  QueryArg,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  UpsertEntry,
> =
  | ([CastAny<BaseQueryResult<BaseQuery>, {}>] extends [NEVER]
      ? never
      : QueryCellVariantWithQuery<
          QueryArg,
          ResultType,
          RawResultType,
          BaseQuery,
          TagTypes,
          ReducerPath,
          UpsertEntry
        >)
  | QueryCellVariantWithQueryFn<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath,
      UpsertEntry
    >

/** Mutation-kind options (mirrors `MutationExtraOptions`). */
export interface MutationCellOptions<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellCommonOptions<QueryArg, ResultType, BaseQuery>,
    CacheLifecycleMutationExtraOptions<
      ResultType,
      QueryArg,
      BaseQuery,
      ReducerPath
    >,
    QueryLifecycleMutationExtraOptions<
      ResultType,
      QueryArg,
      BaseQuery,
      ReducerPath
    > {
  type: DefinitionType.mutation
  /** Determines which cached data should be either re-fetched or removed from the cache. */
  invalidatesTags?: ResultDescription<
    TagTypes,
    ResultType,
    QueryArg,
    BaseQueryError<BaseQuery>,
    BaseQueryMeta<BaseQuery>
  >
  /** Not to be used. A mutation should not provide tags to the cache. */
  providesTags?: never
}

export interface MutationCellVariantWithQuery<
  QueryArg,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellWithQuery<QueryArg, ResultType, RawResultType, BaseQuery>,
    MutationCellOptions<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    > {}

export interface MutationCellVariantWithQueryFn<
  QueryArg,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellWithQueryFn<QueryArg, ResultType, BaseQuery>,
    MutationCellOptions<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    > {}

export type MutationCell<
  QueryArg,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> =
  | ([CastAny<BaseQueryResult<BaseQuery>, {}>] extends [NEVER]
      ? never
      : MutationCellVariantWithQuery<
          QueryArg,
          ResultType,
          RawResultType,
          BaseQuery,
          TagTypes,
          ReducerPath
        >)
  | MutationCellVariantWithQueryFn<
      QueryArg,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    >

/** Infinite-query-kind options (mirrors `InfiniteQueryExtraOptions`). */
export interface InfiniteQueryCellOptions<
  QueryArg,
  PageParam,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellCommonOptions<
      InfiniteQueryCombinedArg<QueryArg, PageParam>,
      ResultType,
      BaseQuery
    >,
    CacheCollectionQueryExtraOptions,
    CacheLifecycleInfiniteQueryExtraOptions<
      InfiniteData<ResultType, PageParam>,
      QueryArg,
      BaseQuery,
      ReducerPath
    >,
    QueryLifecycleInfiniteQueryExtraOptions<
      InfiniteData<ResultType, PageParam>,
      QueryArg,
      BaseQuery,
      ReducerPath
    > {
  type: DefinitionType.infinitequery
  providesTags?: ResultDescription<
    TagTypes,
    InfiniteData<ResultType, PageParam>,
    QueryArg,
    BaseQueryError<BaseQuery>,
    BaseQueryMeta<BaseQuery>
  >
  invalidatesTags?: never
  /**
   * Required options to configure the infinite query behavior.
   */
  infiniteQueryOptions: InfiniteQueryConfigOptions<
    ResultType,
    PageParam,
    QueryArg
  >
  serializeQueryArgs?: SerializeQueryArgs<
    QueryArg,
    string | number | boolean | Record<any, any>
  >
}

export interface InfiniteQueryCellVariantWithQuery<
  QueryArg,
  PageParam,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellWithQuery<
      InfiniteQueryCombinedArg<QueryArg, PageParam>,
      ResultType,
      RawResultType,
      BaseQuery
    >,
    InfiniteQueryCellOptions<
      QueryArg,
      PageParam,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    > {}

export interface InfiniteQueryCellVariantWithQueryFn<
  QueryArg,
  PageParam,
  ResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends CellWithQueryFn<
      InfiniteQueryCombinedArg<QueryArg, PageParam>,
      ResultType,
      BaseQuery
    >,
    InfiniteQueryCellOptions<
      QueryArg,
      PageParam,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    > {}

export type InfiniteQueryCell<
  QueryArg,
  PageParam,
  ResultType,
  RawResultType,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> =
  | ([CastAny<BaseQueryResult<BaseQuery>, {}>] extends [NEVER]
      ? never
      : InfiniteQueryCellVariantWithQuery<
          QueryArg,
          PageParam,
          ResultType,
          RawResultType,
          BaseQuery,
          TagTypes,
          ReducerPath
        >)
  | InfiniteQueryCellVariantWithQueryFn<
      QueryArg,
      PageParam,
      ResultType,
      BaseQuery,
      TagTypes,
      ReducerPath
    >
