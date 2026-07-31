/**
 * EXPERIMENT (declared signatures only, no runtime): "hybrid" encoding.
 *
 * Question: can per-endpoint bodies go back to being small single-pass
 * generic calls (like the 2.x builder), with reverse mapping kept ONLY for
 * a thin `{ kind, upsert? }` shell that needs sibling-endpoint knowledge?
 *
 * - `boundCreators(baseQuery, { tagTypes, reducerPath })` returns creators
 *   that already know BQ/Tag/RP, so each endpoint body is typed inside its
 *   own creator call: one inference site per endpoint, forward inference.
 * - `createApiHybrid` still reverse-maps `Defs`, but each cell the three
 *   checking passes walk is just `{ kind: BoundDef<M>, upsert?: ... }`.
 *
 * Reuses the REAL v3 cell body types so only the call structure differs
 * from the measured v3 encoding. Declared-signature caveat applies: this
 * bounds the mechanism's cost, it is not a shippable API.
 */
import type {
  BaseQueryFn,
  BaseQueryResult,
} from '../../src/query/baseQueryTypes'
import type {
  QueryCellVariantWithQuery,
  MutationCellVariantWithQuery,
} from '../../src/query/v3/cellTypes'
import type {
  QueryMetaRecord,
  MutationMetaRecord,
  AnyMetaRecord,
  DefsShape,
} from '../../src/query/v3/endpointCreators'
import type { ApiV3, UpsertEntryFor } from '../../src/query/v3/apiTypes'

type RawFor<Raw, BQ extends BaseQueryFn> = [unknown] extends [Raw]
  ? BaseQueryResult<BQ>
  : Raw

export interface BoundDef<M extends AnyMetaRecord> {
  $meta: M
}

export interface BoundEndpointCreators<
  BQ extends BaseQueryFn,
  Tag extends string,
  RP extends string,
> {
  query<Result, Arg, Raw = unknown>(
    body: QueryCellVariantWithQuery<
      Arg,
      Result,
      RawFor<Raw, BQ>,
      BQ,
      Tag,
      RP,
      never
    >,
  ): BoundDef<QueryMetaRecord<Result, Arg, Raw>>
  mutation<Result, Arg, Raw = unknown>(
    body: MutationCellVariantWithQuery<
      Arg,
      Result,
      RawFor<Raw, BQ>,
      BQ,
      Tag,
      RP
    >,
  ): BoundDef<MutationMetaRecord<Result, Arg, Raw>>
}

export declare function boundCreators<
  BQ extends BaseQueryFn,
  const Tag extends string = never,
  RP extends string = 'api',
>(
  baseQuery: BQ,
  options?: { tagTypes?: readonly Tag[]; reducerPath?: RP },
): BoundEndpointCreators<BQ, Tag, RP>

export declare function createApiHybrid<
  BQ extends BaseQueryFn,
  Defs extends DefsShape,
  RP extends string = 'api',
  const Tag extends string = never,
>(options: {
  baseQuery: BQ
  reducerPath?: RP
  tagTypes?: readonly Tag[]
  endpoints: {
    [K in keyof Defs]: {
      kind: BoundDef<Defs[K]>
      upsert?: (
        result: Defs[K]['result'],
        arg: Defs[K]['arg'],
      ) => ReadonlyArray<UpsertEntryFor<Defs>>
    }
  }
}): ApiV3<BQ, Defs, RP, Tag>
