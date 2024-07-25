import type {
  Api,
  BaseQueryFn,
  CoreModule,
  EndpointDefinitions,
  Module,
} from '@reduxjs/toolkit/query'

import RTKQuery = require('@reduxjs/toolkit/query')

import coreModule = RTKQuery.coreModule
import buildCreateApi = RTKQuery.buildCreateApi

namespace customModuleFile {
  export const customModuleName = Symbol('customModule')
  export type CustomModule = typeof customModuleName

  export const myModule = (): Module<CustomModule> => ({
    name: customModuleName,
    init(api, options, context) {
      // initialize stuff here if you need to

      return {
        injectEndpoint(endpoint, definition) {
          const anyApi = api as any as Api<
            any,
            Record<string, any>,
            string,
            string,
            CustomModule | CoreModule
          >
          anyApi.endpoints[endpoint].myEndpointProperty = 'test'
        },
      }
    },
  })

  export const myCreateApi = buildCreateApi(coreModule(), myModule())
}

// If we remove this, We should get a TypeScript error.
declare module '@reduxjs/toolkit/query' {
  export interface ApiModules<
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    TagTypes extends string,
  > {
    [customModuleFile.customModuleName]: {
      endpoints: {
        [K in keyof Definitions]: {
          myEndpointProperty: string
        }
      }
    }
  }
}

export = customModuleFile
