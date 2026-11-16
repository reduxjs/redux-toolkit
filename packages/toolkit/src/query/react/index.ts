// This must remain here so that the `mangleErrors.cjs` build script
// does not have to import this into each source file it rewrites.
import { formatProdErrorMessage } from '@reduxjs/toolkit'

import type { CoreModule, CreateApi } from '@reduxjs/toolkit/query'
import { buildCreateApi, coreModule } from './rtkqImports'
import type { ReactHooksModule } from './module'
import { reactHooksModule, reactHooksModuleName } from './module'

export * from '@reduxjs/toolkit/query'
export { ApiProvider } from './ApiProvider'

/**
 * The module names included in the `createApi` exported from `@reduxjs/toolkit/query/react`.
 */
export type ReactApiModules = CoreModule | ReactHooksModule

const createApi: CreateApi<ReactApiModules> = /* @__PURE__ */ buildCreateApi(
  coreModule(),
  reactHooksModule(),
)

export type {
  TypedUseMutationResult,
  TypedUseQueryHookResult,
  TypedUseQueryStateResult,
  TypedUseQuerySubscriptionResult,
  TypedLazyQueryTrigger,
  TypedUseLazyQuery,
  TypedUseMutation,
  TypedMutationTrigger,
  TypedQueryStateSelector,
  TypedUseQueryState,
  TypedUseQuery,
  TypedUseQuerySubscription,
  TypedUseLazyQuerySubscription,
  TypedUseQueryStateOptions,
  TypedUseLazyQueryStateResult,
  TypedUseInfiniteQuery,
  TypedUseInfiniteQueryHookResult,
  TypedUseInfiniteQueryStateResult,
  TypedUseInfiniteQuerySubscriptionResult,
  TypedUseInfiniteQueryStateOptions,
  TypedInfiniteQueryStateSelector,
  TypedUseInfiniteQuerySubscription,
  TypedUseInfiniteQueryState,
  TypedLazyInfiniteQueryTrigger,
  TypedUseQuerySubscriptionOptions,
  TypedUseMutationStateOptions,
  UseInfiniteQueryStateDefaultResult,
  UseQueryStateDefaultResult,
} from './buildHooks'
export { UNINITIALIZED_VALUE } from './constants'
export { createApi, reactHooksModule, reactHooksModuleName }
