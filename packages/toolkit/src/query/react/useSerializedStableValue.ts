import { useEffect, useRef, useMemo } from 'react'
import type { SerializeQueryArgs } from '@reduxjs/toolkit/dist/query/defaultSerializeQueryArgs'
import type { EndpointDefinition } from '@reduxjs/toolkit/dist/query/endpointDefinitions'
import { shallowEqual } from 'react-redux'
import produce from 'immer'
import type { QueryActionCreatorResult } from '../core/buildInitiate'

export function useStableQueryArgs<T>(
  queryArgs: T,
  serialize: SerializeQueryArgs<any>,
  endpointDefinition: EndpointDefinition<any, any, any, any>,
  endpointName: string
) {
  const obj = typeof queryArgs === 'object'
  const { cache } = useQueryArgCache(
    obj ? [queryArgs] : [],
    serialize,
    endpointDefinition,
    endpointName
  )
  return obj ? Object.values(cache)[0].queryArgs : queryArgs
}

type CacheEntry<T> = {
  queryArgs: T
  serialized: string | T
  promise?: QueryActionCreatorResult<any>
}
type Cache<T> = {
  [serialized: string]: CacheEntry<T>
}

export function useQueryArgCache<T>(
  queryArgsArray: Array<T>,
  serialize: SerializeQueryArgs<any>,
  endpointDefinition: EndpointDefinition<any, any, any, any>,
  endpointName: string
) {
  const lastCache = useRef<Cache<T>>({})
  let cache: Cache<T> = {}

  for (const queryArgs of queryArgsArray) {
    const serialized = serialize({
      queryArgs,
      endpointDefinition,
      endpointName,
    })

    cache[serialized] = lastCache.current[serialized] || {
      queryArgs,
      serialized,
    }
  }

  if (shallowEqual(lastCache.current, cache)) {
    cache = lastCache.current
  }

  useEffect(() => {
    lastCache.current = cache
  })

  return { cache, lastCache: lastCache.current }
}
