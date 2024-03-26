import { buildCreateApi } from '../createApi'
import { coreModule, coreModuleName } from './module'

const createApi = /* @__PURE__ */ buildCreateApi(coreModule())

export { coreModule, coreModuleName, createApi }
