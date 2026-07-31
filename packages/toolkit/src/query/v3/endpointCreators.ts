/**
 * RTK Query v3 prototype: endpoint stamps and type-level meta records.
 *
 * Endpoint definitions are produced by the *bound* creators returned from
 * `createApiBuilder` (see ./builder.ts):
 *
 * ```ts
 * const build = createApiBuilder({ baseQuery, tagTypes: ['Todo'] })
 *
 * const api = build.createApi({
 *   endpoints: {
 *     getTodos: {
 *       kind: build.query<Todo[], void>({
 *         request: () => '/todos',
 *       }),
 *     },
 *   },
 * })
 * ```
 *
 * Each creator returns the full endpoint definition at runtime (the body plus
 * the `type` discriminator string the existing RTKQ runtime dispatches on).
 * At the type level the return is a "stamp": the `type` discriminator plus a
 * `$meta` record declaring the endpoint's Result/Arg (and PageParam) types.
 *
 * The `$meta` member sits in plain (non-context-sensitive) position inside the
 * endpoint literal (under the `kind` property), so `build.createApi` can infer
 * the whole endpoint map from the stamps in inference pass one, then
 * contextually type the cross-endpoint options (`upsert`) in pass two. The
 * endpoint *bodies* are typed by ordinary forward inference inside each
 * creator call — which is what restores 2.x inference behaviors like
 * "Arg from an annotated `request` callback parameter" and "Result from the
 * `transformResponse` return type".
 *
 * NOTE: `$meta` is declared as a required property but does not exist at
 * runtime. It is purely an inference vehicle, like the existing `Types` field
 * on endpoint definitions.
 */
import type { DefinitionType } from '../endpointDefinitions'

/**
 * How the endpoint fetches: via the declarative `request` option (`'query'`) or
 * via a hand-written `queryFn` (`'queryFn'`). Carried as a type-level
 * discriminant on the meta record so that each endpoint body is checked
 * against a single interface instead of a two-variant union — measured to be
 * a significant instantiation-count saving at scale.
 */
export type EndpointFlavor = 'query' | 'queryFn'

/**
 * The type-level record carried by a query stamp. `raw` is the raw base query
 * response type used by `transformResponse`.
 */
export interface QueryMetaRecord<
  Result,
  Arg,
  Raw,
  Flavor extends EndpointFlavor = 'query',
> {
  type: DefinitionType.query
  flavor: Flavor
  arg: Arg
  result: Result
  raw: Raw
}

export interface MutationMetaRecord<
  Result,
  Arg,
  Raw,
  Flavor extends EndpointFlavor = 'query',
> {
  type: DefinitionType.mutation
  flavor: Flavor
  arg: Arg
  result: Result
  raw: Raw
}

export interface InfiniteQueryMetaRecord<
  Result,
  Arg,
  PageParam,
  Raw,
  Flavor extends EndpointFlavor = 'query',
> {
  type: DefinitionType.infinitequery
  flavor: Flavor
  arg: Arg
  result: Result
  pageParam: PageParam
  raw: Raw
}

export type AnyMetaRecord =
  | QueryMetaRecord<unknown, unknown, unknown, EndpointFlavor>
  | MutationMetaRecord<unknown, unknown, unknown, EndpointFlavor>
  | InfiniteQueryMetaRecord<unknown, unknown, unknown, unknown, EndpointFlavor>

/** The shape of the inferred endpoint map: endpoint name -> meta record. */
export type DefsShape = Record<string, AnyMetaRecord>

export type QueryEndpointStamp<
  Result,
  Arg,
  Raw = unknown,
  Flavor extends EndpointFlavor = 'query',
> = {
  type: DefinitionType.query
  $meta: QueryMetaRecord<Result, Arg, Raw, Flavor>
}

export type MutationEndpointStamp<
  Result,
  Arg,
  Raw = unknown,
  Flavor extends EndpointFlavor = 'query',
> = {
  type: DefinitionType.mutation
  $meta: MutationMetaRecord<Result, Arg, Raw, Flavor>
}

export type InfiniteQueryEndpointStamp<
  Result,
  Arg,
  PageParam,
  Raw = unknown,
  Flavor extends EndpointFlavor = 'query',
> = {
  type: DefinitionType.infinitequery
  $meta: InfiniteQueryMetaRecord<Result, Arg, PageParam, Raw, Flavor>
}
