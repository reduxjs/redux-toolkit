import { buildCreateApi } from '../createApi'
import { coreModule } from './module'

const createApi = /* @__PURE__ */ buildCreateApi(coreModule())

export { createApi, coreModule }
