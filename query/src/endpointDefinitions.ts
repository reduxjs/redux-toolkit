import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from './core/apiState';
import {
  BaseQueryExtraOptions,
  BaseQueryFn,
  BaseQueryResult,
  BaseQueryArg,
  BaseQueryApi,
  QueryReturnValue,
  BaseQueryError,
  BaseQueryMeta,
} from './baseQueryTypes';
import { HasRequiredProps, MaybePromise, OmitFromUnion, CastAny } from './tsHelpers';
import { NEVER } from './fakeBaseQuery';

const resultType = Symbol();
const baseQuery = Symbol();

interface EndpointDefinitionWithQuery<QueryArg, BaseQuery extends BaseQueryFn, ResultType> {
  /**
   * `query` is the only required property, and can be a function that returns either a `string` or an `object` which is passed to your `baseQuery`. If you are using [fetchBaseQuery](./fetchBaseQuery), this can return either a `string` or an `object` of properties in `FetchArgs`. If you use your own custom `baseQuery`, you can customize this behavior to your liking
   */
  query(arg: QueryArg): BaseQueryArg<BaseQuery>;
  queryFn?: never;
  /**
   * A function to manipulate the data returned by a query or mutation
   */
  transformResponse?(
    baseQueryReturnValue: BaseQueryResult<BaseQuery>,
    meta: BaseQueryMeta<BaseQuery>
  ): ResultType | Promise<ResultType>;
}

interface EndpointDefinitionWithQueryFn<QueryArg, BaseQuery extends BaseQueryFn, ResultType> {
  queryFn(
    arg: QueryArg,
    api: BaseQueryApi,
    extraOptions: BaseQueryExtraOptions<BaseQuery>,
    baseQuery: (arg: Parameters<BaseQuery>[0]) => ReturnType<BaseQuery>
  ): MaybePromise<QueryReturnValue<ResultType, BaseQueryError<BaseQuery>>>;
  query?: never;
  transformResponse?: never;
}

export type BaseEndpointDefinition<QueryArg, BaseQuery extends BaseQueryFn, ResultType> = (
  | ([CastAny<BaseQueryResult<BaseQuery>, {}>] extends [NEVER]
      ? never
      : EndpointDefinitionWithQuery<QueryArg, BaseQuery, ResultType>)
  | EndpointDefinitionWithQueryFn<QueryArg, BaseQuery, ResultType>
) & {
  /* phantom type */
  [resultType]?: ResultType;
  /* phantom type */
  [baseQuery]?: BaseQuery;
} & HasRequiredProps<
    BaseQueryExtraOptions<BaseQuery>,
    { extraOptions: BaseQueryExtraOptions<BaseQuery> },
    { extraOptions?: BaseQueryExtraOptions<BaseQuery> }
  >;

export enum DefinitionType {
  query = 'query',
  mutation = 'mutation',
}

type GetResultDescriptionFn<TagTypes extends string, ResultType, QueryArg, ErrorType> = (
  result: ResultType | undefined,
  error: ErrorType | undefined,
  arg: QueryArg
) => ReadonlyArray<TagDescription<TagTypes>>;

export type FullTagDescription<TagType> = { type: TagType; id?: number | string };
type TagDescription<TagType> = TagType | FullTagDescription<TagType>;
type ResultDescription<TagTypes extends string, ResultType, QueryArg, ErrorType> =
  | ReadonlyArray<TagDescription<TagTypes>>
  | GetResultDescriptionFn<TagTypes, ResultType, QueryArg, ErrorType>;

export interface QueryApi<ReducerPath extends string, Context extends {}> {
  /**
   * The dispatch method for the store
   */
  dispatch: ThunkDispatch<any, any, AnyAction>;
  /**
   * A method to get the current state
   */
  getState(): RootState<any, any, ReducerPath>;
  /**
   * `extra` as provided as `thunk.extraArgument` to the `configureStore` `getDefaultMiddleware` option.
   */
  extra: unknown;
  /**
   * A unique ID generated for the mutation
   */
  requestId: string;
  /**
   * A variable shared between `onStart`, `onError` and `onSuccess` of one request to pass data forward between them
   */
  context: Context;
}

interface QueryExtraOptions<
  TagTypes extends string,
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
  Context = Record<string, any>
> {
  type: DefinitionType.query;
  /**
   * - Used by `queries` to provide tags to the cache.
   * - Expects an array of tag type strings, or an array of objects of tag types with ids.
   *   1.  `['Post']` - equivalent to `b`
   *   2.  `[{ type: 'Post' }]` - equivalent to `a`
   *   3.  `[{ type: 'Post', id: 1 }]`
   */
  providesTags?: ResultDescription<TagTypes, ResultType, QueryArg, BaseQueryError<BaseQuery>>;
  /** @deprecated renamed to `providesTags` */
  provides?: ResultDescription<TagTypes, ResultType, QueryArg, BaseQueryError<BaseQuery>>;
  /**
   * Not to be used. A query should not invalidate tags in the cache.
   */
  invalidatesTags?: never;
  /** @deprecated */
  invalidates?: never;
  /**
   * Called when the query is triggered.
   * @param arg - The argument supplied to the query
   * @param queryApi - An object containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   */
  onStart?(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>): void;
  /**
   * Called when an error response is returned by the query.
   * @param arg - The argument supplied to the query
   * @param queryApi - A query API containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   * @param error - The error returned by the query
   * @param meta - Meta item from the base query
   */
  onError?(
    arg: QueryArg,
    queryApi: QueryApi<ReducerPath, Context>,
    error: unknown,
    meta: BaseQueryMeta<BaseQuery>
  ): void;
  /**
   * Called when a successful response is returned by the query.
   * @param arg - The argument supplied to the query
   * @param queryApi - A query API containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   * @param result - The response returned by the query
   * @param meta - Meta item from the base query
   */
  onSuccess?(
    arg: QueryArg,
    queryApi: QueryApi<ReducerPath, Context>,
    result: ResultType,
    meta: BaseQueryMeta<BaseQuery> | undefined
  ): void;
}

export type QueryDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ResultType,
  ReducerPath extends string = string,
  Context = Record<string, any>
> = BaseEndpointDefinition<QueryArg, BaseQuery, ResultType> &
  QueryExtraOptions<TagTypes, ResultType, QueryArg, BaseQuery, ReducerPath, Context>;

export interface MutationApi<ReducerPath extends string, Context extends {}> {
  /**
   * The dispatch method for the store
   */
  dispatch: ThunkDispatch<any, any, AnyAction>;
  /**
   * A method to get the current state
   */
  getState(): RootState<any, any, ReducerPath>;
  /**
   * `extra` as provided as `thunk.extraArgument` to the `configureStore` `getDefaultMiddleware` option.
   */
  extra: unknown;
  /**
   * A unique ID generated for the mutation
   */
  requestId: string;
  /**
   * A variable shared between `onStart`, `onError` and `onSuccess` of one request to pass data forward between them
   */
  context: Context;
}

interface MutationExtraOptions<
  TagTypes extends string,
  ResultType,
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string = string,
  Context = Record<string, any>
> {
  type: DefinitionType.mutation;
  /**
   * - Used by `mutations` for [cache invalidation](../concepts/mutations#advanced-mutations-with-revalidation) purposes.
   * - Expects the same shapes as `provides`.
   */
  invalidatesTags?: ResultDescription<TagTypes, ResultType, QueryArg, BaseQueryError<BaseQuery>>;
  /** @deprecated renamed to `invalidatesTags` */
  invalidates?: ResultDescription<TagTypes, ResultType, QueryArg, BaseQueryError<BaseQuery>>;
  /**
   * Not to be used. A mutation should not provide tags to the cache.
   */
  providesTags?: never;
  /** @deprecated */
  provides?: never;
  /**
   * Called when the mutation is triggered.
   * @param arg - The argument supplied to the query
   * @param mutationApi - An object containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   */
  onStart?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>): void;
  /**
   * Called when an error response is returned by the mutation.
   * @param arg - The argument supplied to the query
   * @param mutationApi - A mutation API containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   * @param error - The error returned by the mutation
   * @param meta - Meta item from the base query
   */
  onError?(
    arg: QueryArg,
    mutationApi: MutationApi<ReducerPath, Context>,
    error: unknown,
    meta: BaseQueryMeta<BaseQuery>
  ): void;
  /**
   * Called when a successful response is returned by the mutation.
   * @param arg - The argument supplied to the query
   * @param mutationApi - A mutation API containing `dispatch`, `getState()`, `extra`, `request`Id`, `context`
   * @param result - The response returned by the mutation
   * @param meta - Meta item from the base query
   */
  onSuccess?(
    arg: QueryArg,
    mutationApi: MutationApi<ReducerPath, Context>,
    result: ResultType,
    meta: BaseQueryMeta<BaseQuery> | undefined
  ): void;
}

export type MutationDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ResultType,
  ReducerPath extends string = string,
  Context = Record<string, any>
> = BaseEndpointDefinition<QueryArg, BaseQuery, ResultType> &
  MutationExtraOptions<TagTypes, ResultType, QueryArg, BaseQuery, ReducerPath, Context>;

export type EndpointDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ResultType,
  ReducerPath extends string = string
> =
  | QueryDefinition<QueryArg, BaseQuery, TagTypes, ResultType, ReducerPath>
  | MutationDefinition<QueryArg, BaseQuery, TagTypes, ResultType, ReducerPath>;

export type EndpointDefinitions = Record<string, EndpointDefinition<any, any, any, any>>;

export function isQueryDefinition(e: EndpointDefinition<any, any, any, any>): e is QueryDefinition<any, any, any, any> {
  return e.type === DefinitionType.query;
}

export function isMutationDefinition(
  e: EndpointDefinition<any, any, any, any>
): e is MutationDefinition<any, any, any, any> {
  return e.type === DefinitionType.mutation;
}

export type EndpointBuilder<BaseQuery extends BaseQueryFn, TagTypes extends string, ReducerPath extends string> = {
  /**
   * An endpoint definition that retrieves data, and may provide tags to the cache.
   *
   * @example
   * ```js
   * // codeblock-meta title="Example of all query endpoint options"
   * const api = createApi({
   *  baseQuery,
   *  endpoints: (build) => ({
   *    getPost: build.query({
   *      query: (id) => ({ url: `post/${id}` }),
   *      // Pick out data and prevent nested properties in a hook or selector
   *      transformResponse: (response) => response.data,
   *      // The 2nd parameter is the destructured `queryApi`
   *      onStart(id, { dispatch, getState, extra, requestId, context }) {},
   *      // `result` is the server response
   *      onSuccess(id, queryApi, result) {},
   *      onError(id, queryApi) {},
   *      providesTags: (result, error, id) => [{ type: 'Post', id }],
   *    }),
   *  }),
   *});
   *```
   */
  query<ResultType, QueryArg>(
    definition: OmitFromUnion<QueryDefinition<QueryArg, BaseQuery, TagTypes, ResultType>, 'type'>
  ): QueryDefinition<QueryArg, BaseQuery, TagTypes, ResultType>;
  /**
   * An endpoint definition that alters data on the server or will possibly invalidate the cache.
   *
   * @example
   * ```js
   * // codeblock-meta title="Example of all mutation endpoint options"
   * const api = createApi({
   *   baseQuery,
   *   endpoints: (build) => ({
   *     updatePost: build.mutation({
   *       query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
   *       // Pick out data and prevent nested properties in a hook or selector
   *       transformResponse: (response) => response.data,
   *       // onStart, onSuccess, onError are useful for optimistic updates
   *       // The 2nd parameter is the destructured `mutationApi`
   *       onStart({ id, ...patch }, { dispatch, getState, extra, requestId, context }) {},
   *       // `result` is the server response
   *       onSuccess({ id }, mutationApi, result) {},
   *       onError({ id }, { dispatch, getState, extra, requestId, context }) {},
   *       invalidatesTags: (result, error, id) => [{ type: 'Post', id }],
   *     }),
   *   }),
   * });
   * ```
   */
  mutation<ResultType, QueryArg, Context = Record<string, any>>(
    definition: OmitFromUnion<
      MutationDefinition<QueryArg, BaseQuery, TagTypes, ResultType, ReducerPath, Context>,
      'type'
    >
  ): MutationDefinition<QueryArg, BaseQuery, TagTypes, ResultType, ReducerPath, Context>;
};

export type AssertTagTypes = <T extends FullTagDescription<string>>(t: T) => T;

export function calculateProvidedBy<ResultType, QueryArg, ErrorType>(
  description: ResultDescription<string, ResultType, QueryArg, ErrorType> | undefined,
  result: ResultType | undefined,
  error: ErrorType | undefined,
  queryArg: QueryArg,
  assertTagTypes: AssertTagTypes
): readonly FullTagDescription<string>[] {
  if (isFunction(description)) {
    return description(result as ResultType, error as undefined, queryArg)
      .map(expandTagDescription)
      .map(assertTagTypes);
  }
  if (Array.isArray(description)) {
    return description.map(expandTagDescription).map(assertTagTypes);
  }
  return [];
}

function isFunction<T>(t: T): t is Extract<T, Function> {
  return typeof t === 'function';
}

function expandTagDescription(description: TagDescription<string>): FullTagDescription<string> {
  return typeof description === 'string' ? { type: description } : description;
}

export type QueryArgFrom<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<
  infer QA,
  any,
  any
>
  ? QA
  : unknown;
export type ResultTypeFrom<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<
  any,
  any,
  infer RT
>
  ? RT
  : unknown;

export type ReducerPathFrom<D extends EndpointDefinition<any, any, any, any>> = D extends EndpointDefinition<
  any,
  any,
  any,
  infer RP
>
  ? RP
  : unknown;

export type TagTypesFrom<D extends EndpointDefinition<any, any, any, any>> = D extends EndpointDefinition<
  any,
  any,
  infer RP,
  any
>
  ? RP
  : unknown;

export type ReplaceTagTypes<Definitions extends EndpointDefinitions, NewTagTypes extends string> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
    infer QueryArg,
    infer BaseQuery,
    any,
    infer ResultType,
    infer ReducerPath
  >
    ? QueryDefinition<QueryArg, BaseQuery, NewTagTypes, ResultType, ReducerPath>
    : Definitions[K] extends MutationDefinition<
        infer QueryArg,
        infer BaseQuery,
        any,
        infer ResultType,
        infer ReducerPath
      >
    ? MutationDefinition<QueryArg, BaseQuery, NewTagTypes, ResultType, ReducerPath>
    : never;
};
