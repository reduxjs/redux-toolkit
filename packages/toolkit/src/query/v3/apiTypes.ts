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
 * The `endpoints` map accepted by the v3 `enhanceEndpoints`: per endpoint,
 * either a partial definition merged over the existing one, or a recipe
 * function that mutates it in place.
 *
 * Unlike the current API's `enhanceEndpoints`, there is no result-type
 * rewriting (`UpdateDefinitions`/`TransformedResponse`): the v3 way to change
 * an endpoint's result type is `injectEndpoints` with `overrideExisting`, or
 * composing cell objects before `createApi`.
 */
export type EnhanceEndpointsCells<
  Defs extends DefsShape,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> = {
  [K in keyof Defs]?:
    | Partial<EndpointCellBody<Defs[K], BaseQuery, TagTypes, ReducerPath>>
    | ((
        definition: EndpointCellBody<
          Defs[K],
          BaseQuery,
          TagTypes,
          ReducerPath
        >,
      ) => void)
}

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
  enhanceEndpoints<NewTagTypes extends string = never>(_: {
    addTagTypes?: readonly NewTagTypes[]
    endpoints?: EnhanceEndpointsCells<
      Defs,
      BaseQuery,
      TagTypes | NoInfer<NewTagTypes>,
      ReducerPath
    >
  }): ApiV3<BaseQuery, Defs, ReducerPath, TagTypes | NewTagTypes>
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
