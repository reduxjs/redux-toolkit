/**
 * RTK Query v3 prototype entry point (framework-agnostic core).
 *
 * The primary export is `createApiBuilder`. React bindings are attached
 * either via the react entry's own `createApiBuilder` (hooks pre-wired) or
 * by calling `reactify(api)` on a core api; both live in ./react.ts so the
 * core entry never imports React.
 */
export { createApiBuilder } from './builder'
export type {
  ApiBuilder,
  ApiBuilderConfig,
  BoundInfiniteQueryCreator,
  BoundMutationCreator,
  BoundQueryCreator,
} from './builder'
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
  BoundCreateApiOptions,
  CoreApiSurface,
  CreateApiV3Options,
  EndpointCellBody,
  EndpointCells,
  EnhanceEndpointsCells,
  QueryDefKeys,
  ToDefinitions,
  UpsertEntryFor,
} from './apiTypes'
