/**
 * RTK Query v3 prototype entry point (framework-agnostic core).
 *
 * The primary export is `createApi`. It returns the api instance itself,
 * which carries the bound endpoint creators (`api.query`, `api.mutation`,
 * `api.infiniteQuery`); endpoints attach either via the optional
 * `endpoints` callback on the options or via `injectEndpoints`.
 *
 * React bindings are attached either via the react entry's own `createApi`
 * (hooks pre-wired) or by calling `reactify(api)` on a core api; both live
 * in ./react.ts so the core entry never imports React.
 */
export { createApi } from './createApi'
export type {
  BoundInfiniteQueryCreator,
  BoundMutationCreator,
  BoundQueryCreator,
  EndpointCreators,
} from './creators'
export type {
  AnyMetaRecord,
  DefsShape,
  EndpointFlavor,
  InfiniteQueryEndpointStamp,
  InfiniteQueryMetaRecord,
  MutationEndpointStamp,
  MutationMetaRecord,
  QueryEndpointStamp,
  QueryMetaRecord,
} from './endpointCreators'
export type {
  ApiTypesBag,
  ApiV3,
  ApiV3Base,
  CoreApiSurface,
  CreateApiV3Options,
  EndpointCellBody,
  EndpointCells,
  EnhancedInfiniteQueryDefs,
  EnhancedMutationDefs,
  EnhancedQueryDefs,
  InfiniteQueryDefKeys,
  InfiniteQueryEndpointEnhancement,
  InjectEndpointsArg,
  MutationDefKeys,
  MutationEndpointEnhancement,
  QueryDefKeys,
  QueryEndpointEnhancement,
  ToDefinitions,
  UpsertEntryFor,
  UpsertTransform,
} from './apiTypes'
