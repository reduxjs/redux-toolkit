import { enablePatches } from 'immer'
import { buildCreateApi, CreateApi } from '../createApi'
import { coreModule, coreModuleName } from './module'

enablePatches()

const createApi = buildCreateApi(coreModule())

export { createApi, coreModule }
