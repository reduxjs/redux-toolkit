/**
 * RTK Query v3 prototype: the bound endpoint creators.
 *
 * Every v3 api object carries `query`, `mutation`, and `infiniteQuery`
 * creators whose types are *bound* to the api's base query, tag types, and
 * reducer path:
 *
 * ```ts
 * const baseApi = createApi({
 *   baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
 *   tagTypes: ['Todo'],
 * })
 *
 * const api = baseApi.injectEndpoints({
 *   endpoints: {
 *     getTodos: baseApi.query<Todo[], void>({
 *       request: () => '/todos',
 *       providesTags: ['Todo'],
 *     }),
 *   },
 * })
 * ```
 *
 * The same creators are handed to the optional `endpoints` callback on
 * `createApi` (and to a callback passed to `injectEndpoints`), which is what
 * makes the one-call form read like the 2.x builder callback:
 *
 * ```ts
 * const api = createApi({
 *   baseQuery,
 *   tagTypes: ['Todo'],
 *   endpoints: (build) => ({
 *     getTodos: build.query<Todo[], void>({ request: () => '/todos' }),
 *   }),
 * })
 * ```
 *
 * Why creators bound to a *value* instead of the 2.x builder *callback* on
 * `createApi`'s options: the 2.x callback form makes TypeScript type the
 * builder before the endpoints object exists, which is exactly the temporal
 * ordering that blocks cross-endpoint types. With bound creators, each
 * creator call is a small, cheap, single-pass forward-inference site (this
 * is where 2.x inference behaviors like "Arg from an annotated `request`
 * parameter" and "Result from the `transformResponse` return type" live),
 * while the `endpoints` map itself is reverse-mapped so cross-endpoint
 * options like `upsert` can be typed against the whole map.
 *
 * The creators are static at runtime — the binding is type-level only. Each
 * creator returns the body plus the `type` discriminator string the existing
 * runtime dispatches on; at the type level, the return is a stamp carrying
 * the endpoint's `$meta` record.
 *
 * KNOWN TYPE HOLE (accepted for the prototype): the `endpoints` shell only
 * checks the stamp's `$meta`, so a stamp minted by a *different* api's
 * creators (with a different base query) would be accepted. Stamps carry no
 * base-query brand yet.
 */
import type { BaseQueryFn, BaseQueryResult } from '../baseQueryTypes'
import {
  ENDPOINT_INFINITEQUERY,
  ENDPOINT_MUTATION,
  ENDPOINT_QUERY,
} from '../endpointDefinitions'
import type {
  InfiniteQueryCellVariantWithQuery,
  InfiniteQueryCellVariantWithQueryFn,
  MutationCellVariantWithQuery,
  MutationCellVariantWithQueryFn,
  QueryCellVariantWithQuery,
  QueryCellVariantWithQueryFn,
} from './cellTypes'
import type {
  InfiniteQueryEndpointStamp,
  MutationEndpointStamp,
  QueryEndpointStamp,
} from './endpointCreators'

export interface BoundQueryCreator<
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> {
  /**
   * Declares a query endpoint fetched via the declarative `request` option.
   * Result/Arg are usually inferred from the body (annotated `request`
   * parameter, `transformResponse` return, or schemas); explicit generics
   * work like 2.x: `api.query<Todo[], void>({...})`.
   */
  <Result, Arg, Raw = BaseQueryResult<BaseQuery>>(
    body: QueryCellVariantWithQuery<
      Arg,
      Result,
      Raw,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): QueryEndpointStamp<Result, Arg, Raw>
  /**
   * Declares a query endpoint implemented with a hand-written `queryFn`
   * instead of the declarative `request` option. A separate creator flavor
   * (rather than a union on the body type) so each body is checked against a
   * single interface — a measured compile-time saving at scale.
   */
  fn: <Result, Arg>(
    body: QueryCellVariantWithQueryFn<
      Arg,
      Result,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ) => QueryEndpointStamp<Result, Arg, unknown, 'queryFn'>
}

export interface BoundMutationCreator<
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> {
  /** Declares a mutation endpoint. */
  <Result, Arg, Raw = BaseQueryResult<BaseQuery>>(
    body: MutationCellVariantWithQuery<
      Arg,
      Result,
      Raw,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): MutationEndpointStamp<Result, Arg, Raw>
  /** Declares a mutation endpoint implemented with a hand-written `queryFn`. */
  fn: <Result, Arg>(
    body: MutationCellVariantWithQueryFn<
      Arg,
      Result,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ) => MutationEndpointStamp<Result, Arg, unknown, 'queryFn'>
}

export interface BoundInfiniteQueryCreator<
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> {
  /**
   * Declares an infinite query endpoint. `infiniteQueryOptions` is required
   * in the body, exactly as in 2.x.
   */
  <Result, Arg, PageParam, Raw = BaseQueryResult<BaseQuery>>(
    body: InfiniteQueryCellVariantWithQuery<
      Arg,
      PageParam,
      Result,
      Raw,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): InfiniteQueryEndpointStamp<Result, Arg, PageParam, Raw>
  /**
   * Declares an infinite query endpoint implemented with a hand-written
   * `queryFn`.
   */
  fn: <Result, Arg, PageParam>(
    body: InfiniteQueryCellVariantWithQueryFn<
      Arg,
      PageParam,
      Result,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ) => InfiniteQueryEndpointStamp<Result, Arg, PageParam, unknown, 'queryFn'>
}

/**
 * The trio of bound endpoint creators. Present on every v3 api object, and
 * passed to the `endpoints` callback accepted by `createApi` and
 * `injectEndpoints`.
 */
export interface EndpointCreators<
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> {
  query: BoundQueryCreator<BaseQuery, TagTypes, ReducerPath>
  mutation: BoundMutationCreator<BaseQuery, TagTypes, ReducerPath>
  infiniteQuery: BoundInfiniteQueryCreator<BaseQuery, TagTypes, ReducerPath>
}

/**
 * The single runtime implementation behind every bound creator: attach the
 * `type` discriminator the existing runtime dispatches on. The type-level
 * "binding" to the base query is carried entirely by the interfaces above.
 */
function makeCreator(type: string) {
  return Object.assign((body: any) => ({ type, ...body }), {
    fn: (body: any) => ({ type, ...body }),
  })
}

/** Internal: builds the runtime creator trio attached to every v3 api. */
export function makeEndpointCreators(): Record<string, any> {
  return {
    query: makeCreator(ENDPOINT_QUERY),
    mutation: makeCreator(ENDPOINT_MUTATION),
    infiniteQuery: makeCreator(ENDPOINT_INFINITEQUERY),
  }
}
