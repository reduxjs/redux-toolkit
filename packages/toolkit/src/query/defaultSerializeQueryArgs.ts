import type { QueryCacheKey } from './core/index'
import { isPlainObject } from './core/rtkImports'
import type { EndpointDefinition } from './endpointDefinitions'

const cache: WeakMap<any, string> | undefined =
  typeof WeakMap === 'undefined' ? undefined : new WeakMap()

export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({
  endpointName,
  queryArgs,
}) => {
  let serialized = ''

  const cached = cache?.get(queryArgs)

  if (typeof cached === 'string') {
    serialized = cached
  } else {
    const stringified = JSON.stringify(queryArgs, (key, value) => {
      // Handle bigints
      value = typeof value === 'bigint' ? { $bigint: value.toString() } : value
      // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than useQuery({ b: 2, a: 1 })
      value = isPlainObject(value)
        ? Object.keys(value)
            .sort()
            .reduce<any>((acc, key) => {
              acc[key] = (value as any)[key]
              return acc
            }, {})
        : value
      return value
    })
    if (isPlainObject(queryArgs)) {
      cache?.set(queryArgs, stringified)
    }
    serialized = stringified
  }
  return `${endpointName}(${serialized})`
}

export type SerializeQueryArgs<
  QueryArgs,
  SerializedQueryResultType = string,
> = (_: {
  queryArgs: QueryArgs
  endpointDefinition: EndpointDefinition<any, any, any, any>
  endpointName: string
}) => SerializedQueryResultType

export type InternalSerializeQueryArgs = (_: {
  queryArgs: any
  endpointDefinition: EndpointDefinition<any, any, any, any>
  endpointName: string
}) => QueryCacheKey
