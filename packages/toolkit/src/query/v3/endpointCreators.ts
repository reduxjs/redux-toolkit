/**
 * RTK Query v3 prototype: standalone endpoint creators.
 *
 * These replace the `build.query()` / `build.mutation()` / `build.infiniteQuery()`
 * builder methods. Each creator is a zero-argument "phantom stamp": at runtime it
 * returns only the `type` discriminator that the existing RTKQ runtime already
 * dispatches on; at the type level it additionally carries a `$meta` record
 * declaring the endpoint's Result/Arg (and PageParam) types.
 *
 * Usage:
 * ```ts
 * endpoints: {
 *   getTodos: {
 *     ...query<Todo[], void>(),
 *     query: () => '/todos',
 *   },
 * }
 * ```
 *
 * The `$meta` member sits in plain (non-context-sensitive) position inside the
 * endpoint literal, so `createApi` can infer the whole endpoint map from the
 * stamps in inference pass one, then contextually type every callback
 * (`query`, `transformResponse`, `onQueryStarted`, `upsert`, ...) in pass two.
 *
 * NOTE: `$meta` is declared as a required property but does not exist at
 * runtime. It is purely an inference vehicle, like the existing `Types` field
 * on endpoint definitions.
 */
import {
  DefinitionType,
  ENDPOINT_INFINITEQUERY,
  ENDPOINT_MUTATION,
  ENDPOINT_QUERY,
} from '../endpointDefinitions'

/**
 * The type-level record carried by a query stamp. `raw` is the raw base query
 * response type used by `transformResponse`; when left as `unknown` it
 * defaults to `BaseQueryResult<BaseQuery>` at the `createApi` boundary.
 */
export interface QueryMetaRecord<Result, Arg, Raw> {
  type: DefinitionType.query
  arg: Arg
  result: Result
  raw: Raw
}

export interface MutationMetaRecord<Result, Arg, Raw> {
  type: DefinitionType.mutation
  arg: Arg
  result: Result
  raw: Raw
}

export interface InfiniteQueryMetaRecord<Result, Arg, PageParam, Raw> {
  type: DefinitionType.infinitequery
  arg: Arg
  result: Result
  pageParam: PageParam
  raw: Raw
}

export type AnyMetaRecord =
  | QueryMetaRecord<unknown, unknown, unknown>
  | MutationMetaRecord<unknown, unknown, unknown>
  | InfiniteQueryMetaRecord<unknown, unknown, unknown, unknown>

/** The shape of the inferred endpoint map: endpoint name -> meta record. */
export type DefsShape = Record<string, AnyMetaRecord>

export type QueryEndpointStamp<Result, Arg, Raw = unknown> = {
  type: DefinitionType.query
  $meta: QueryMetaRecord<Result, Arg, Raw>
}

export type MutationEndpointStamp<Result, Arg, Raw = unknown> = {
  type: DefinitionType.mutation
  $meta: MutationMetaRecord<Result, Arg, Raw>
}

export type InfiniteQueryEndpointStamp<Result, Arg, PageParam, Raw = unknown> = {
  type: DefinitionType.infinitequery
  $meta: InfiniteQueryMetaRecord<Result, Arg, PageParam, Raw>
}

/**
 * Declares a query endpoint. Spread the result into the endpoint definition
 * literal: `{ ...query<Todo[], void>(), query: () => '/todos' }`.
 */
export function query<Result, Arg, Raw = unknown>(): QueryEndpointStamp<
  Result,
  Arg,
  Raw
> {
  return { type: ENDPOINT_QUERY } as QueryEndpointStamp<Result, Arg, Raw>
}

/**
 * Declares a mutation endpoint. Spread the result into the endpoint definition
 * literal: `{ ...mutation<Todo, Partial<Todo>>(), query: (patch) => ({...}) }`.
 */
export function mutation<Result, Arg, Raw = unknown>(): MutationEndpointStamp<
  Result,
  Arg,
  Raw
> {
  return { type: ENDPOINT_MUTATION } as MutationEndpointStamp<Result, Arg, Raw>
}

/**
 * Declares an infinite query endpoint. Spread the result into the endpoint
 * definition literal alongside `infiniteQueryOptions`:
 * ```ts
 * {
 *   ...infiniteQuery<Pokemon[], string, number>(),
 *   infiniteQueryOptions: { initialPageParam: 0, getNextPageParam: (...) => ... },
 *   query: ({ queryArg, pageParam }) => `pokemon/${queryArg}?page=${pageParam}`,
 * }
 * ```
 */
export function infiniteQuery<
  Result,
  Arg,
  PageParam,
  Raw = unknown,
>(): InfiniteQueryEndpointStamp<Result, Arg, PageParam, Raw> {
  return { type: ENDPOINT_INFINITEQUERY } as InfiniteQueryEndpointStamp<
    Result,
    Arg,
    PageParam,
    Raw
  >
}
