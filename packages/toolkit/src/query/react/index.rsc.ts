// This must remain here so that the `mangleErrors.cjs` build script
// does not have to import this into each source file it rewrites.
import { formatProdErrorMessage } from '@reduxjs/toolkit'

import { buildCreateApi, coreModule } from '@reduxjs/toolkit/query'
import { unboundHooksModule, reactHooksModuleName } from './module'

export * from '@reduxjs/toolkit/query'
export { ApiProvider } from './ApiProvider'

const throwFn = () => {
  throw new Error('Hooks can only be used in Client Components')
}

const reactHooksModule = unboundHooksModule({
  hooks: {
    useDispatch: throwFn,
    useSelector: throwFn,
    useStore: throwFn,
  },
  batch: throwFn,
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
} from './buildHooks'
export { UNINITIALIZED_VALUE } from './constants'
export { createApi, reactHooksModule, reactHooksModuleName }
