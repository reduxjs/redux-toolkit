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

/**
 * The v3-only `upsert` endpoint option: a sync transform from an endpoint's
 * (post-`transformResponse`) result into upsert descriptors for *other* query
 * endpoints' cache entries.
 */
export type UpsertOption<Defs extends DefsShape, M extends AnyMetaRecord> = {
  /**
   * Derives cache upserts for other query endpoints from this endpoint's
   * result. Runs after a fulfilled fetch; the returned entries are written
   * via `api.util.upsertQueryEntries`.
   */
  upsert?: (
    result: M['result'],
    arg: M['arg'],
  ) => ReadonlyArray<UpsertEntryFor<Defs>>
}

export type QueryEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  Defs extends DefsShape,
  ReducerPath extends string,
> = QueryCellVariantWithQuery<
  M['arg'],
  M['result'],
  RawResultFor<M, BaseQuery>,
  BaseQuery,
  TagTypes,
  ReducerPath,
  UpsertEntryFor<Defs>
>

export type QueryFnEndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  Defs extends DefsShape,
  ReducerPath extends string,
> = QueryCellVariantWithQueryFn<
  M['arg'],
  M['result'],
  BaseQuery,
  TagTypes,
  ReducerPath,
  UpsertEntryFor<Defs>
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
 * Maps a meta record to the endpoint definition body (everything except
 * `$meta`, which must stay a plain member of the mapped type below so it can
 * serve as the reverse-inference source — inference cannot flow into a
 * conditional type).
 *
 * The `flavor` discriminant (from the `query()` vs `query.fn()` creators)
 * selects a single variant interface per endpoint instead of a
 * `WithQuery | WithQueryFn` union — checking each literal against one
 * interface instead of a two-variant union is a measured ~27% slope saving.
 */
export type EndpointCellBody<
  M extends AnyMetaRecord,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  Defs extends DefsShape,
  ReducerPath extends string,
> = M extends { type: DefinitionType.query }
  ? M extends { flavor: 'queryFn' }
    ? QueryFnEndpointCellBody<M, BaseQuery, TagTypes, Defs, ReducerPath>
    : QueryEndpointCellBody<M, BaseQuery, TagTypes, Defs, ReducerPath>
  : M extends { type: DefinitionType.mutation }
    ? M extends { flavor: 'queryFn' }
      ? MutationFnEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
      : MutationEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
    : M extends { type: DefinitionType.infinitequery }
      ? M extends { flavor: 'queryFn' }
        ? InfiniteQueryFnEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
        : InfiniteQueryEndpointCellBody<M, BaseQuery, TagTypes, ReducerPath>
      : never

export type EndpointCells<
  Defs extends DefsShape,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  // Upsert targets may span a wider map than the cells being defined
  // (e.g. `injectEndpoints` cells may target original endpoints).
  UpsertTargets extends DefsShape = Defs,
> = {
  [K in keyof Defs]: { $meta: Defs[K] } & EndpointCellBody<
    Defs[K],
    BaseQuery,
    TagTypes,
    UpsertTargets,
    ReducerPath
  >
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
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
  UpsertTargets extends DefsShape,
> = {
  endpoints: EndpointCells<
    NewDefs,
    BaseQuery,
    TagTypes,
    ReducerPath,
    UpsertTargets
  >
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
    | Partial<
        EndpointCellBody<Defs[K], BaseQuery, TagTypes, Defs, ReducerPath>
      >
    | ((
        definition: EndpointCellBody<
          Defs[K],
          BaseQuery,
          TagTypes,
          Defs,
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
    _: InjectEndpointsArg<
      NewDefs,
      BaseQuery,
      TagTypes,
      ReducerPath,
      Defs & NewDefs
    >,
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

/** Options accepted by the v3 `createApi`. */
export type CreateApiV3Options<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = {
  baseQuery: BaseQuery
  endpoints: EndpointCells<Defs, BaseQuery, TagTypes, ReducerPath>
  tagTypes?: readonly TagTypes[]
  reducerPath?: ReducerPath
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
