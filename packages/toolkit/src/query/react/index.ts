// This must remain here so that the `mangleErrors.cjs` build script
// does not have to import this into each source file it rewrites.
import { formatProdErrorMessage } from '@reduxjs/toolkit'
import { batch, useDispatch, useSelector, useStore } from 'react-redux'

import { buildCreateApi, coreModule } from '@reduxjs/toolkit/query'
import { unboundHooksModule, reactHooksModuleName } from './module'

export * from '@reduxjs/toolkit/query'
export { ApiProvider } from './ApiProvider'

const reactHooksModule = unboundHooksModule({
  hooks: {
    useDispatch,
    useSelector,
    useStore,
  },
  batch,
})

const createApi = /* @__PURE__ */ buildCreateApi(
  coreModule(),
  reactHooksModule()
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
} from './buildHooks'
export { UNINITIALIZED_VALUE } from './constants'
export { createApi, reactHooksModule, reactHooksModuleName }
