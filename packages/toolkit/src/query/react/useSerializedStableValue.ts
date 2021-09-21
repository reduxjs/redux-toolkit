import { useEffect, useRef, useMemo } from 'react'
import type { SerializeQueryArgs } from '@reduxjs/toolkit/dist/query/defaultSerializeQueryArgs'
import type { EndpointDefinition } from '@reduxjs/toolkit/dist/query/endpointDefinitions'
import { skipToken } from '@reduxjs/toolkit/query'

export function useStableQueryArgs<T>(
  queryArgs: T | typeof skipToken,
  serialize: SerializeQueryArgs<any>,
  endpointDefinition: EndpointDefinition<any, any, any, any>,
  endpointName: string
) {
  const incoming = useMemo(
    () => ({
      queryArgs,
      serialized:
        queryArgs === skipToken
          ? skipToken
          : serialize({ queryArgs, endpointDefinition, endpointName }),
    }),
    [queryArgs, serialize, endpointDefinition, endpointName]
  )
  const cache = useRef(incoming)
  useEffect(() => {
    if (cache.current.serialized !== incoming.serialized) {
      cache.current = incoming
    }
  }, [incoming])

  return cache.current.serialized === incoming.serialized
    ? cache.current.queryArgs
    : queryArgs
}
