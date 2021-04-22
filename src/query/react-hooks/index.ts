import { coreModule, coreModuleName } from '../core/module'
import { buildCreateApi, CreateApi } from '../createApi'
import { reactHooksModule, reactHooksModuleName } from './module'

const createApi = buildCreateApi(coreModule(), reactHooksModule())

export { createApi, reactHooksModule }
