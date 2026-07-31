/**
 * RTK Query v3 prototype: the type layer.
 *
 * Key ideas, relative to the current architecture:
 *
 * - The endpoint map is inferred as a lightweight `Defs` record
 *   (name -> `{type, arg, result, ...}`) from the phantom `$meta` stamps,
 *   using the reverse-mapped-type ("Andarist") two-pass inference mechanism.
 *   Pass one infers `Defs` (and BaseQuery/TagTypes/ReducerPath from sibling
 *   properties); pass two contextually types every callback in every endpoint
 *   literal with all of those known. This is what enables the cross-endpoint
 *   `upsert` option to be fully typed.
 *
 * - The api object's public type is built by *indexing* `ApiModules` with the
 *   core module key only — no `UnionToIntersection`, no `Enhancers` type
 *   parameter. The React layer is a plain function (`reactify`) that returns
 *   a differently-named api type; no module-name registry is involved.
 *
 * - `$types` is a phantom type bag on the api object (the tRPC idiom), which
 *   keeps `Defs` recoverable so downstream helpers like `reactify` can be
 *   plain generic functions.
 *
 * The per-endpoint definition types (`QueryDefinition` etc.) and the entire
 * core api surface (`ApiModules[coreModuleName]`) are reused from the existing
 * implementation for behavior and type parity.
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import type { BaseQueryFn, BaseQueryResult } from '../baseQueryTypes'
import type {
  DefinitionType,
  EndpointDefinitions,
  InfiniteQueryDefinition,
  MutationDefinition,
  QueryDefinition,
  SchemaFailureConverter,
  SchemaFailureHandler,
  SchemaType,
} from '../endpointDefinitions'
import type { CombinedState } from '../core/apiState'
import type { ApiModules } from '../core/module'
import { coreModuleName } from '../core/module'
import type { SerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type { Id } from '../../tsHelpers'
import type {
  InfiniteQueryCellVariantWithQuery,
  InfiniteQueryCellVariantWithQueryFn,
  MutationCellVariantWithQuery,
  MutationCellVariantWithQueryFn,
  QueryCellVariantWithQuery,
  QueryCellVariantWithQueryFn,
} from './cellTypes'
import type {
  AnyMetaRecord,
  DefsShape,
  InfiniteQueryMetaRecord,
  MutationMetaRecord,
  QueryMetaRecord,
} from './endpointCreators'

/**
 * Resolves the `Raw` slot of a meta record against the base query.
 * `unknown` (the creator default) means "use `BaseQueryResult<BaseQuery>`".
 */
export type RawResultFor<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
> = unknown extends M['raw']
  ? BaseQueryResult<BaseQuery>
  : M['raw'] extends BaseQueryResult<BaseQuery>
    ? M['raw']
    : BaseQueryResult<BaseQuery>

type PageParamOf<M> = M extends { pageParam: infer P } ? P : never

/** Endpoint names in `Defs` whose kind is `query`. */
export type QueryDefKeys<Defs extends DefsShape> = {
  [K in keyof Defs]: Defs[K] extends { type: DefinitionType.query }
    ? K
    : never
}[keyof Defs] &
  string

/** Endpoint names in `Defs` whose kind is `mutation`. */
export type MutationDefKeys<Defs extends DefsShape> = {
  [K in keyof Defs]: Defs[K] extends { type: DefinitionType.mutation }
    ? K
    : never
}[keyof Defs] &
  string

/** Endpoint names in `Defs` whose kind is `infiniteQuery`. */
export type InfiniteQueryDefKeys<Defs extends DefsShape> = {
  [K in keyof Defs]: Defs[K] extends { type: DefinitionType.infinitequery }
    ? K
    : never
}[keyof Defs] &
  string

/**
 * Replaces one endpoint's meta record in the `Defs` map. This is the whole
 * type-level mechanism behind `enhanceEndpoint`'s arg/result rewriting: the
 * v3 `Defs` map is lightweight meta records, so swapping one entry is a
 * plain `Omit & Record` with no definition-type inference involved.
 */
type SwapDef<
  Defs extends DefsShape,
  Name extends keyof Defs,
  NewM extends AnyMetaRecord,
> = Id<Omit<Defs, Name> & Record<Name, NewM>>

/** The `Defs` map after `enhanceEndpoint` rewrites a query endpoint. */
export type EnhancedQueryDefs<
  Defs extends DefsShape,
  Name extends QueryDefKeys<Defs>,
  NewResult,
  NewArg,
> = SwapDef<
  Defs,
  Name,
  QueryMetaRecord<NewResult, NewArg, Defs[Name]['raw'], Defs[Name]['flavor']>
>

/** The `Defs` map after `enhanceEndpoint` rewrites a mutation endpoint. */
export type EnhancedMutationDefs<
  Defs extends DefsShape,
  Name extends MutationDefKeys<Defs>,
  NewResult,
  NewArg,
> = SwapDef<
  Defs,
  Name,
  MutationMetaRecord<NewResult, NewArg, Defs[Name]['raw'], Defs[Name]['flavor']>
>

/** The `Defs` map after `enhanceEndpoint` rewrites an infinite query endpoint. */
export type EnhancedInfiniteQueryDefs<
  Defs extends DefsShape,
  Name extends InfiniteQueryDefKeys<Defs>,
  NewResult,
  NewArg,
> = SwapDef<
  Defs,
  Name,
  InfiniteQueryMetaRecord<
    NewResult,
    NewArg,
    PageParamOf<Defs[Name]>,
    Defs[Name]['raw'],
    Defs[Name]['flavor']
  >
>

/**
 * The typed cross-endpoint upsert descriptor: a discriminated union over all
 * query endpoints in the api. `arg` and `value` narrow from the `endpoint`
 * name.
 */
export type UpsertEntryFor<Defs extends DefsShape> = {
  [K in QueryDefKeys<Defs>]: {
    endpoint: K
    arg: Defs[K]['arg']
    value: Defs[K]['result']
  }
}[QueryDefKeys<Defs>]

/** The signature of the cross-endpoint `upsert` option. */
export type UpsertTransform<Result, Arg, Targets extends DefsShape> = (
  result: Result,
  arg: Arg,
) => ReadonlyArray<UpsertEntryFor<Targets>>

export type QueryEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = QueryCellVariantWithQuery<
  M['arg'],
  M['result'],
  RawResultFor<M, BaseQuery>,
  BaseQuery,
  TagTypes,
  ReducerPath
>

export type QueryFnEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = QueryCellVariantWithQueryFn<
  M['arg'],
  M['result'],
  BaseQuery,
  TagTypes,
  ReducerPath
>

export type MutationEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = MutationCellVariantWithQuery<
  M['arg'],
  M['result'],
  RawResultFor<M, BaseQuery>,
  BaseQuery,
  TagTypes,
  ReducerPath
>

export type MutationFnEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = MutationCellVariantWithQueryFn<
  M['arg'],
  M['result'],
  BaseQuery,
  TagTypes,
  ReducerPath
>

export type InfiniteQueryEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = InfiniteQueryCellVariantWithQuery<
  M['arg'],
  PageParamOf<M>,
  M['result'],
  RawResultFor<M, BaseQuery>,
  BaseQuery,
  TagTypes,
  ReducerPath
>

export type InfiniteQueryFnEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = InfiniteQueryCellVariantWithQueryFn<
  M['arg'],
  PageParamOf<M>,
  M['result'],
  BaseQuery,
  TagTypes,
  ReducerPath
>

/**
 * Maps a meta record to the full endpoint definition body (as produced by the
 * bound creators — `build.query({...})` etc.). Used by `enhanceEndpoints`,
 * which operates on the stored, post-merge definitions.
 *
 * The `flavor` discriminant (from the `build.query()` vs `build.query.fn()`
 * creators) selects a single variant interface per endpoint instead of a
 * `WithQuery | WithQueryFn` union — checking each body against one interface
 * instead of a two-variant union is a measured ~27% slope saving.
 */
export type EndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = M extends { type: DefinitionType.query }
  ? M extends { flavor: 'queryFn' }
    ? QueryFnEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
    : QueryEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
  : M extends { type: DefinitionType.mutation }
    ? M extends { flavor: 'queryFn' }
      ? MutationFnEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
      : MutationEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
    : M extends { type: DefinitionType.infinitequery }
      ? M extends { flavor: 'queryFn' }
        ? InfiniteQueryFnEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
        : InfiniteQueryEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
      : never

/**
 * The `endpoints` map accepted by `build.createApi` / `injectEndpoints`:
 * a thin shell per endpoint. The endpoint *body* lives inside the bound
 * creator call (a small, single-pass forward-inference site); the shell
 * carries only:
 *
 * - `kind`: the creator's return value. Its `$meta` member is the
 *   reverse-inference source for `Defs[K]`.
 * - `upsert` (query kinds only): the one option typed against the whole
 *   endpoint map, which is why it must live out here in the reverse-mapped
 *   layer rather than inside the creator call.
 */
export type EndpointCells<
  Defs extends DefsShape,
  // Upsert targets may span a wider map than the cells being defined
  // (e.g. `injectEndpoints` cells may target original endpoints).
  UpsertTargets extends DefsShape = Defs,
> = {
  [K in keyof Defs]: {
    /**
     * The endpoint definition, produced by the builder's `query()`,
     * `mutation()`, or `infiniteQuery()` creators (or their `.fn` flavors).
     */
    kind: { $meta: Defs[K] }
  }
} & {
  // The v3-only `upsert` option: a sync transform from a query endpoint's
  // (post-`transformResponse`) result into upsert descriptors for *other*
  // query endpoints' cache entries, written via `api.util.upsertQueryEntries`.
  // It lives here in the shell (next to `kind`), not in the creator body,
  // because it is the one option typed against the whole endpoint map — which
  // only exists at the `createApi` call.
  //
  // Encoding note: this second mapped type over the pre-filtered
  // `QueryDefKeys<Defs>` replaces a per-key `M extends { type: query } ? ...`
  // conditional. The filter runs once for the whole map instead of once per
  // key per checking pass — measured ~57K fewer instantiations at 201
  // endpoints with upserts, ~7K fewer without.
  [K in QueryDefKeys<Defs>]: {
    /**
     * Derives cache upserts for other query endpoints from this endpoint's
     * result. Runs after a fulfilled fetch.
     */
    upsert?: (
      result: Defs[K]['result'],
      arg: Defs[K]['arg'],
    ) => ReadonlyArray<UpsertEntryFor<UpsertTargets>>
  }
}

/**
 * Converts the lightweight `Defs` record into the existing runtime's
 * `EndpointDefinitions` map, so the entire existing core surface
 * (`ApiModules[coreModuleName]`) can be reused as-is.
 */
export type ToDefinitions<
  Defs extends DefsShape,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = {
  [K in keyof Defs]: Defs[K] extends QueryMetaRecord<
    infer Result,
    infer Arg,
    any,
    any
  >
    ? QueryDefinition<Arg, BaseQuery, TagTypes, Result, ReducerPath>
    : Defs[K] extends MutationMetaRecord<infer Result, infer Arg, any, any>
      ? MutationDefinition<Arg, BaseQuery, TagTypes, Result, ReducerPath>
      : Defs[K] extends InfiniteQueryMetaRecord<
            infer Result,
            infer Arg,
            infer PageParam,
            any,
            any
          >
        ? InfiniteQueryDefinition<
            Arg,
            PageParam,
            BaseQuery,
            TagTypes,
            Result,
            ReducerPath
          >
        : never
}

/** The phantom type bag carried on every v3 api object. */
export type ApiTypesBag<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = {
  baseQuery: BaseQuery
  defs: Defs
  reducerPath: ReducerPath
  tagTypes: TagTypes
}

/**
 * The core (framework-agnostic) api surface: the existing core module's
 * public shape, indexed directly — no `UnionToIntersection`.
 */
export type CoreApiSurface<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = ApiModules<
  BaseQuery,
  ToDefinitions<Defs, BaseQuery, TagTypes, ReducerPath>,
  ReducerPath,
  TagTypes
>[typeof coreModuleName]

export type ApiV3Base<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = CoreApiSurface<BaseQuery, Defs, ReducerPath, TagTypes> & {
  /**
   * Phantom type information. `null` at runtime — do not use as a value.
   */
  $types: ApiTypesBag<BaseQuery, Defs, ReducerPath, TagTypes>
}

export type InjectEndpointsArg<
  NewDefs extends DefsShape,
  UpsertTargets extends DefsShape,
> = {
  endpoints: EndpointCells<NewDefs, UpsertTargets>
  overrideExisting?: boolean | 'throw'
}

/**
 * The enhancement accepted by `enhanceEndpoint` for a query endpoint:
 * either a partial definition merged over the existing one (the object form
 * infers `NewResult`/`NewArg`, e.g. from a `transformResponse` return type),
 * or a recipe function that mutates the definition in place (rewriting types
 * with the recipe form requires explicit generics — no inference source).
 *
 * The partial may also carry the cross-endpoint `upsert` option, typed
 * against the full endpoint map — so upserts can be added to an existing api
 * (something the `endpoints` map's shell also allows at `createApi` time).
 *
 * Both flavor variants (`request`-based and `queryFn`-based) are accepted;
 * contextual typing selects the matching one. This is the same looseness the
 * current API's `QueryDefinition` union has.
 */
export type QueryEndpointEnhancement<
  NewArg,
  NewResult,
  M extends AnyMetaRecord,
  Defs extends DefsShape,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> =
  | (Partial<
      QueryCellVariantWithQuery<
        NewArg,
        NewResult,
        RawResultFor<M, BaseQuery>,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    > & { upsert?: UpsertTransform<NewResult, NewArg, Defs> })
  | (Partial<
      QueryCellVariantWithQueryFn<
        NewArg,
        NewResult,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    > & { upsert?: UpsertTransform<NewResult, NewArg, Defs> })
  | ((
      definition: EndpointCellBody<
        QueryMetaRecord<NewResult, NewArg, M['raw'], M['flavor']>,
        BaseQuery,
        TagTypes,
        ReducerPath
      > & { upsert?: UpsertTransform<NewResult, NewArg, Defs> },
    ) => void)

/** The enhancement accepted by `enhanceEndpoint` for a mutation endpoint. */
export type MutationEndpointEnhancement<
  NewArg,
  NewResult,
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> =
  | Partial<
      MutationCellVariantWithQuery<
        NewArg,
        NewResult,
        RawResultFor<M, BaseQuery>,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    >
  | Partial<
      MutationCellVariantWithQueryFn<
        NewArg,
        NewResult,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    >
  | ((
      definition: EndpointCellBody<
        MutationMetaRecord<NewResult, NewArg, M['raw'], M['flavor']>,
        BaseQuery,
        TagTypes,
        ReducerPath
      >,
    ) => void)

/**
 * The enhancement accepted by `enhanceEndpoint` for an infinite query
 * endpoint. `NewResult` is the per-page result type; the page param is
 * preserved from the original definition.
 */
export type InfiniteQueryEndpointEnhancement<
  NewArg,
  NewResult,
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> =
  | Partial<
      InfiniteQueryCellVariantWithQuery<
        NewArg,
        PageParamOf<M>,
        NewResult,
        RawResultFor<M, BaseQuery>,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    >
  | Partial<
      InfiniteQueryCellVariantWithQueryFn<
        NewArg,
        PageParamOf<M>,
        NewResult,
        BaseQuery,
        TagTypes,
        ReducerPath
      >
    >
  | ((
      definition: EndpointCellBody<
        InfiniteQueryMetaRecord<
          NewResult,
          NewArg,
          PageParamOf<M>,
          M['raw'],
          M['flavor']
        >,
        BaseQuery,
        TagTypes,
        ReducerPath
      >,
    ) => void)

/** The framework-agnostic v3 api object type. */
export type ApiV3<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = ApiV3Base<BaseQuery, Defs, ReducerPath, TagTypes> & {
  injectEndpoints<NewDefs extends DefsShape>(
    _: InjectEndpointsArg<NewDefs, Defs & NewDefs>,
  ): ApiV3<BaseQuery, Defs & NewDefs, ReducerPath, TagTypes>
  /**
   * Registers additional tag types, widening the api's tag union. Chainable.
   * (Adopted from PR #3485 / issue #2730. Cheaper here than in the 2.x
   * design: v3 `Defs` records don't carry tag types, so this only widens a
   * type parameter — no re-mapping of every definition.)
   */
  addTagTypes<NewTagTypes extends string = never>(
    ...tags: NewTagTypes[]
  ): ApiV3<BaseQuery, Defs, ReducerPath, TagTypes | NewTagTypes>
  /**
   * Modifies one endpoint in place, optionally rewriting its result and/or
   * arg type. The object form merges a partial definition and infers
   * `NewResult`/`NewArg` (e.g. from a `transformResponse` return type); the
   * recipe form mutates the definition and requires explicit generics to
   * rewrite types. Chainable. (Adopted from PR #3485 / issue #2730.)
   */
  enhanceEndpoint<
    Name extends QueryDefKeys<Defs>,
    NewResult = Defs[Name]['result'],
    NewArg = Defs[Name]['arg'],
  >(
    name: Name,
    enhancement: QueryEndpointEnhancement<
      NewArg,
      NewResult,
      Defs[Name],
      Defs,
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): ApiV3<
    BaseQuery,
    EnhancedQueryDefs<Defs, Name, NewResult, NewArg>,
    ReducerPath,
    TagTypes
  >
  enhanceEndpoint<
    Name extends MutationDefKeys<Defs>,
    NewResult = Defs[Name]['result'],
    NewArg = Defs[Name]['arg'],
  >(
    name: Name,
    enhancement: MutationEndpointEnhancement<
      NewArg,
      NewResult,
      Defs[Name],
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): ApiV3<
    BaseQuery,
    EnhancedMutationDefs<Defs, Name, NewResult, NewArg>,
    ReducerPath,
    TagTypes
  >
  enhanceEndpoint<
    Name extends InfiniteQueryDefKeys<Defs>,
    NewResult = Defs[Name]['result'],
    NewArg = Defs[Name]['arg'],
  >(
    name: Name,
    enhancement: InfiniteQueryEndpointEnhancement<
      NewArg,
      NewResult,
      Defs[Name],
      BaseQuery,
      TagTypes,
      ReducerPath
    >,
  ): ApiV3<
    BaseQuery,
    EnhancedInfiniteQueryDefs<Defs, Name, NewResult, NewArg>,
    ReducerPath,
    TagTypes
  >
}

/**
 * Options accepted by `build.createApi`. The type-bearing trio
 * (`baseQuery`, `tagTypes`, `reducerPath`) is NOT here — it was already
 * given to `createApiBuilder`, which is what lets the bound creators type
 * every endpoint body against the base query.
 */
export type BoundCreateApiOptions<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = {
  endpoints: EndpointCells<Defs>
  serializeQueryArgs?: SerializeQueryArgs<unknown>
  keepUnusedDataFor?: number
  refetchOnMountOrArgChange?: boolean | number
  refetchOnFocus?: boolean
  refetchOnReconnect?: boolean
  invalidationBehavior?: 'delayed' | 'immediately'
  extractRehydrationInfo?: (
    action: UnknownAction,
    info: { reducerPath: ReducerPath },
  ) =>
    | undefined
    | CombinedState<
        ToDefinitions<Defs, BaseQuery, TagTypes, ReducerPath>,
        TagTypes,
        ReducerPath
      >
  onSchemaFailure?: SchemaFailureHandler
  catchSchemaFailure?: SchemaFailureConverter<BaseQuery>
  skipSchemaValidation?: boolean | SchemaType[]
}

/**
 * Internal: the combined options object the v3 runtime `createApi` receives
 * (the builder config merged with the `build.createApi` options).
 */
export type CreateApiV3Options<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = BoundCreateApiOptions<BaseQuery, Defs, ReducerPath, TagTypes> & {
  baseQuery: BaseQuery
  tagTypes?: readonly TagTypes[]
  reducerPath?: ReducerPath
}

/**
 * Internal: the plumbing handle stored on every v3 api object, giving
 * enhancers like `reactify` sanctioned access to the construction context.
 */
export type ApiPlumbing = {
  context: import('../apiTypes').ApiContext<EndpointDefinitions>
  optionsWithDefaults: Record<string, unknown>
  initializedModules: Array<{
    injectEndpoint(endpointName: string, definition: unknown): void
  }>
}
