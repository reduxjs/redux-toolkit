/**
 * RTK Query v3 prototype entry point (framework-agnostic core).
 *
 * React bindings are attached separately via `reactify` (./reactify.tsx),
 * which is exported from the v3 react entry rather than here so the core
 * entry never imports React.
 */
export { createApi } from './createApi'
export { query, mutation, infiniteQuery } from './endpointCreators'
export type {
  AnyMetaRecord,
  EndpointCreatorFnSchemas,
  EndpointFlavor,
  InfiniteQueryCreator,
  MutationCreator,
  QueryCreator,
  DefsShape,
  EndpointCreatorSchemas,
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
  EnhanceEndpointsCells,
  QueryDefKeys,
  ToDefinitions,
  UpsertEntryFor,
  UpsertOption,
} from './apiTypes'
