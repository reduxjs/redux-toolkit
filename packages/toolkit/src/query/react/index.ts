import { reactHooksModule, reactHooksModuleName } from './module'
import { buildCreateApi, coreModule } from './rtkqImports'

const createApi = /* @__PURE__ */ buildCreateApi(
  coreModule(),
  reactHooksModule(),
)

export * from '@reduxjs/toolkit/query'
export { ApiProvider } from './ApiProvider'
export type {
  TypedInfiniteQueryStateSelector,
  TypedLazyInfiniteQueryTrigger,
  TypedLazyQueryTrigger,
  TypedMutationTrigger,
  TypedQueryStateSelector,
  TypedUseInfiniteQuery,
  TypedUseInfiniteQueryHookResult,
  TypedUseInfiniteQueryState,
  TypedUseInfiniteQueryStateOptions,
  TypedUseInfiniteQueryStateResult,
  TypedUseInfiniteQuerySubscription,
  TypedUseInfiniteQuerySubscriptionResult,
  TypedUseLazyQuery,
  TypedUseLazyQueryStateResult,
  TypedUseLazyQuerySubscription,
  TypedUseMutation,
  TypedUseMutationResult,
  TypedUseMutationStateOptions,
  TypedUseQuery,
  TypedUseQueryHookResult,
  TypedUseQueryState,
  TypedUseQueryStateOptions,
  TypedUseQueryStateResult,
  TypedUseQuerySubscription,
  TypedUseQuerySubscriptionOptions,
  TypedUseQuerySubscriptionResult,
} from './buildHooks'
export { UNINITIALIZED_VALUE } from './constants'
export { createApi, reactHooksModule, reactHooksModuleName }
