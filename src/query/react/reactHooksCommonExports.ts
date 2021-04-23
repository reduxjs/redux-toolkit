import { coreModule, coreModuleName } from '../core/module'
import { buildCreateApi, CreateApi } from '../createApi'
import {
  reactHooksModule,
  reactHooksModuleName,
  ReactHooksBaseEndpoints,
} from './module'

import { MutationHooks, QueryHooks } from './buildHooks'
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
} from '../endpointDefinitions'
import { BaseQueryFn } from '../baseQueryTypes'

import { QueryKeys } from '../core/apiState'
import { PrefetchOptions } from '../core/module'

const createApi = buildCreateApi(coreModule(), reactHooksModule())

export { createApi, reactHooksModule }
