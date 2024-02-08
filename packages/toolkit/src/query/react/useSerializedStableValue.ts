import type {
  EndpointDefinition,
  SerializeQueryArgs,
} from '@reduxjs/toolkit/query'
import { useEffect, useMemo, useRef } from 'react'

export function useStableQueryArgs<T>(
  queryArgs: T,
  serialize: SerializeQueryArgs<any>,
  endpointDefinition: EndpointDefinition<any, any, any, any>,
  endpointName: string,
) {
  const incoming = useMemo(
    () => ({
      queryArgs,
      serialized:
        typeof queryArgs == 'object'
          ? serialize({ queryArgs, endpointDefinition, endpointName })
          : queryArgs,
    }),
    [queryArgs, serialize, endpointDefinition, endpointName],
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
