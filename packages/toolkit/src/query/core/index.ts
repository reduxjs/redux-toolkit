import { buildCreateApi } from '../createApi'
import { coreModule } from './module'

export const createApi = /* @__PURE__ */ buildCreateApi(coreModule())

export { QueryStatus } from './apiState'
export type {
  CombinedState,
  MutationKeys,
  QueryCacheKey,
  QueryKeys,
  QuerySubState,
  RootState,
  SubscriptionOptions,
} from './apiState'
export type {
  MutationActionCreatorResult,
  QueryActionCreatorResult,
  StartQueryActionCreatorOptions,
} from './buildInitiate'
export type {
  MutationCacheLifecycleApi,
  MutationLifecycleApi,
  QueryCacheLifecycleApi,
  QueryLifecycleApi,
  SubscriptionSelectors,
  TypedMutationOnQueryStarted,
  TypedQueryOnQueryStarted,
} from './buildMiddleware/index'
export { skipToken } from './buildSelectors'
export type {
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
  ApiEndpointMutation,
  ApiEndpointQuery,
  CoreModule,
  InternalActions,
  PrefetchOptions,
  ThunkWithReturnValue,
} from './module'
export { setupListeners } from './setupListeners'
export { buildCreateApi, coreModule }
