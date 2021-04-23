import { reactHooksModuleName, ReactHooksBaseEndpoints } from './module'

import { EndpointDefinitions } from '../endpointDefinitions'
import { BaseQueryFn } from '../baseQueryTypes'
import { TS41Hooks } from './ts41Types'

export * from '..'
export { ApiProvider } from './ApiProvider'

export { createApi } from './reactHooksCommonExports'
export * from './reactHooksCommonExports'

declare module '../apiTypes' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ReducerPath extends string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TagTypes extends string
  > {
    [reactHooksModuleName]: ReactHooksBaseEndpoints<Definitions> &
      TS41Hooks<Definitions>
  }
}
