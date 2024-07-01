// This must remain here so that the `mangleErrors.cjs` build script
// does not have to import this into each source file it rewrites.
import { formatProdErrorMessage } from '@reduxjs/toolkit'

import { buildCreateApi, coreModule } from '@reduxjs/toolkit/query'
import {
  reactHooksModule,
  reactHooksModuleName,
  buildHooksForApi,
} from './module'

export * from '@reduxjs/toolkit/query'
export { ApiProvider } from './ApiProvider'

const createApi = /* @__PURE__ */ buildCreateApi(
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
  TypedUseQueryState,
  TypedUseQuery,
  TypedUseQuerySubscription,
  TypedUseLazyQuerySubscription,
} from './buildHooks'
export { createApi, reactHooksModule, reactHooksModuleName, buildHooksForApi }
