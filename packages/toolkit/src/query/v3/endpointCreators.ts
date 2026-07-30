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
import type { StandardSchemaV1 } from '@standard-schema/spec'
import {
  DefinitionType,
  ENDPOINT_INFINITEQUERY,
  ENDPOINT_MUTATION,
  ENDPOINT_QUERY,
} from '../endpointDefinitions'

/**
 * How the endpoint fetches: via the declarative `query` option (`'query'`) or
 * via a hand-written `queryFn` (`'queryFn'`). Carried as a type-level
 * discriminant on the meta record so that each endpoint literal is checked
 * against a single interface instead of a two-variant union — measured to be
 * a significant instantiation-count saving at scale.
 */
export type EndpointFlavor = 'query' | 'queryFn'

/**
 * The type-level record carried by a query stamp. `raw` is the raw base query
 * response type used by `transformResponse`; when left as `unknown` it
 * defaults to `BaseQueryResult<BaseQuery>` at the `createApi` boundary.
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

/**
 * The Standard Schema slots that participate in endpoint *type inference*.
 * These can be passed to the `query()` / `mutation()` creators so that the
 * endpoint's Arg/Result/Raw types are inferred from the schemas with no
 * explicit generics — matching the current builder's "schemas as a source of
 * inference" behavior. The creator returns the schemas at runtime, so the
 * spread lands them on the endpoint definition where the existing runtime
 * validation (`executeEndpoint`) already reads them.
 *
 * The remaining schema slots (`errorResponseSchema`, `metaSchema`,
 * `rawErrorResponseSchema`) depend on the base query's types, which are not
 * known at the creator call site; they stay in the endpoint literal itself and
 * are validated against the base query there.
 *
 * Like the current API, schemas must have matching input and output types
 * (no transforms) for the definition slots (`StandardSchemaV1<T>`) to accept
 * them.
 */
export interface EndpointCreatorSchemas {
  argSchema?: StandardSchemaV1
  responseSchema?: StandardSchemaV1
  rawResponseSchema?: StandardSchemaV1
}

/**
 * The schema slots accepted by the `.fn` creator flavors. `rawResponseSchema`
 * is excluded: `queryFn` endpoints have no raw response.
 */
export type EndpointCreatorFnSchemas = Omit<
  EndpointCreatorSchemas,
  'rawResponseSchema'
>

type SchemaOutputOr<S, Fallback> = S extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<S>
  : Fallback

export interface QueryCreator {
  /**
   * Declares a query endpoint fetched via the declarative `query` option.
   * Spread the result into the endpoint definition literal:
   * `{ ...query<Todo[], void>(), query: () => '/todos' }`.
   */
  <Result, Arg, Raw = unknown>(): QueryEndpointStamp<Result, Arg, Raw>
  /**
   * Declares a query endpoint, inferring its types from Standard Schemas with
   * no explicit generics:
   * `{ ...query({ argSchema, responseSchema }), query: (arg) => ... }`.
   */
  <S extends EndpointCreatorSchemas>(
    schemas: S,
  ): QueryEndpointStamp<
    SchemaOutputOr<S['responseSchema'], unknown>,
    SchemaOutputOr<S['argSchema'], unknown>,
    SchemaOutputOr<S['rawResponseSchema'], unknown>
  > &
    S
  /**
   * Declares a query endpoint implemented with a hand-written `queryFn`
   * instead of the declarative `query` option:
   * `{ ...query.fn<Session, void>(), queryFn: async () => ({ data: ... }) }`.
   *
   * This is a separate creator flavor (rather than a union on the definition
   * type) so each endpoint literal is checked against a single interface —
   * a measured compile-time saving at scale.
   */
  fn: {
    <Result, Arg>(): QueryEndpointStamp<Result, Arg, unknown, 'queryFn'>
    <S extends EndpointCreatorFnSchemas>(
      schemas: S,
    ): QueryEndpointStamp<
      SchemaOutputOr<S['responseSchema'], unknown>,
      SchemaOutputOr<S['argSchema'], unknown>,
      unknown,
      'queryFn'
    > &
      S
  }
}

export const query: QueryCreator = /* @__PURE__ */ Object.assign(
  (schemas?: EndpointCreatorSchemas) =>
    ({ type: ENDPOINT_QUERY, ...schemas }) as any,
  {
    fn: (schemas?: EndpointCreatorFnSchemas) =>
      ({ type: ENDPOINT_QUERY, ...schemas }) as any,
  },
)

export interface MutationCreator {
  /**
   * Declares a mutation endpoint. Spread the result into the endpoint
   * definition literal:
   * `{ ...mutation<Todo, Partial<Todo>>(), query: (patch) => ({...}) }`.
   */
  <Result, Arg, Raw = unknown>(): MutationEndpointStamp<Result, Arg, Raw>
  /**
   * Declares a mutation endpoint, inferring its types from Standard Schemas
   * with no explicit generics:
   * `{ ...mutation({ argSchema, responseSchema }), query: (arg) => ... }`.
   */
  <S extends EndpointCreatorSchemas>(
    schemas: S,
  ): MutationEndpointStamp<
    SchemaOutputOr<S['responseSchema'], unknown>,
    SchemaOutputOr<S['argSchema'], unknown>,
    SchemaOutputOr<S['rawResponseSchema'], unknown>
  > &
    S
  /**
   * Declares a mutation endpoint implemented with a hand-written `queryFn`:
   * `{ ...mutation.fn<Todo, Partial<Todo>>(), queryFn: async (patch) => ({ data: ... }) }`.
   */
  fn: {
    <Result, Arg>(): MutationEndpointStamp<Result, Arg, unknown, 'queryFn'>
    <S extends EndpointCreatorFnSchemas>(
      schemas: S,
    ): MutationEndpointStamp<
      SchemaOutputOr<S['responseSchema'], unknown>,
      SchemaOutputOr<S['argSchema'], unknown>,
      unknown,
      'queryFn'
    > &
      S
  }
}

export const mutation: MutationCreator = /* @__PURE__ */ Object.assign(
  (schemas?: EndpointCreatorSchemas) =>
    ({ type: ENDPOINT_MUTATION, ...schemas }) as any,
  {
    fn: (schemas?: EndpointCreatorFnSchemas) =>
      ({ type: ENDPOINT_MUTATION, ...schemas }) as any,
  },
)

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
export interface InfiniteQueryCreator {
  <Result, Arg, PageParam, Raw = unknown>(): InfiniteQueryEndpointStamp<
    Result,
    Arg,
    PageParam,
    Raw
  >
  /**
   * Declares an infinite query endpoint implemented with a hand-written
   * `queryFn` instead of the declarative `query` option.
   */
  fn: {
    <Result, Arg, PageParam>(): InfiniteQueryEndpointStamp<
      Result,
      Arg,
      PageParam,
      unknown,
      'queryFn'
    >
  }
}

export const infiniteQuery: InfiniteQueryCreator = /* @__PURE__ */ Object.assign(
  () => ({ type: ENDPOINT_INFINITEQUERY }) as any,
  {
    fn: () => ({ type: ENDPOINT_INFINITEQUERY }) as any,
  },
)
