import { coreModule, buildCreateApi, CreateApi } from '@reduxjs/toolkit/query'
import { reactHooksModule, reactHooksModuleName } from './module'

import type { MutationHooks, QueryHooks } from './buildHooks'
import type {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
} from '@reduxjs/toolkit/dist/query/endpointDefinitions'
import type { BaseQueryFn } from '@reduxjs/toolkit/dist/query/baseQueryTypes'

import type { QueryKeys } from '@reduxjs/toolkit/dist/query/core/apiState'
import type { PrefetchOptions } from '@reduxjs/toolkit/dist/query/core/module'
export { SuspenseQueryError } from './exceptions'
export * from '@reduxjs/toolkit/query'
export { useSuspendAll } from './suspense-utils'
export type {
  Suspendable,
  Resource,
  SuspendableResource,
  UseSuspendAllOutput,
  ResolvedSuspendableResource,
  IdleResource,
  IdleSuspendableResource,
} from './suspense-utils'

export { ApiProvider } from './ApiProvider'

const createApi = /* @__PURE__ */ buildCreateApi(
  coreModule(),
  reactHooksModule()
)

export { createApi, reactHooksModule }
