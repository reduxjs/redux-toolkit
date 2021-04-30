import { QueryCacheKey } from './core/apiState'
import { EndpointDefinition } from './endpointDefinitions'

export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({
  endpointName,
  queryArgs,
}) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than useQuery({ b: 2, a: 1 })
  return `${endpointName}(${JSON.stringify(
    queryArgs,
    Object.keys(queryArgs || {}).sort()
  )})`
}

export type SerializeQueryArgs<QueryArgs> = (_: {
  queryArgs: QueryArgs
  endpointDefinition: EndpointDefinition<any, any, any, any>
  endpointName: string
}) => string

export type InternalSerializeQueryArgs = (_: {
  queryArgs: any
  endpointDefinition: EndpointDefinition<any, any, any, any>
  endpointName: string
}) => QueryCacheKey
