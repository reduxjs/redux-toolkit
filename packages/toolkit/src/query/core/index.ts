import { buildCreateApi } from '../createApi'
import { coreModule } from './module'

export const createApi = /* @__PURE__ */ buildCreateApi(coreModule())

export { QueryStatus } from './apiState'
export type {
  CombinedState,
  InfiniteData,
  InfiniteQueryConfigOptions,
  InfiniteQueryDirection,
  InfiniteQuerySubState,
  MutationKeys,
  QueryCacheKey,
  QueryKeys,
  QuerySubState,
  RootState,
  SubscriptionOptions,
} from './apiState'
export type {
  InfiniteQueryActionCreatorResult,
  MutationActionCreatorResult,
  QueryActionCreatorResult,
  StartInfiniteQueryActionCreator,
  StartQueryActionCreatorOptions,
} from './buildInitiate'
export type {
  CacheCollectionQueryExtraOptions,
  CacheLifecycleInfiniteQueryExtraOptions,
  CacheLifecycleMutationExtraOptions,
  CacheLifecycleQueryExtraOptions,
  MutationCacheLifecycleApi,
  MutationLifecycleApi,
  QueryCacheLifecycleApi,
  QueryLifecycleApi,
  QueryLifecycleInfiniteQueryExtraOptions,
  QueryLifecycleMutationExtraOptions,
  QueryLifecycleQueryExtraOptions,
  SubscriptionSelectors,
  TypedMutationOnQueryStarted,
  TypedQueryOnQueryStarted,
} from './buildMiddleware/index'
export { skipToken } from './buildSelectors'
export type {
  InfiniteQueryResultSelectorResult,
  MutationResultSelectorResult,
  QueryResultSelectorResult,
  SkipToken,
} from './buildSelectors'
export type { SliceActions } from './buildSlice'
export type {
  PatchQueryDataThunk,
  UpdateQueryDataThunk,
  UpsertQueryDataThunk,
} from './buildThunks'
export { coreModuleName } from './module'
export type {
  ApiEndpointInfiniteQuery,
  ApiEndpointMutation,
  ApiEndpointQuery,
  ApiModules,
  CoreModule,
  InternalActions,
  PrefetchOptions,
  ThunkWithReturnValue,
} from './module'
export { setupListeners } from './setupListeners'
export { buildCreateApi, coreModule }
