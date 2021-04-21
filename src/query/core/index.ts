import { buildCreateApi, CreateApi } from '../createApi'
import { coreModule, coreModuleName } from './module'

const createApi = buildCreateApi(coreModule())

export { createApi, coreModule }
