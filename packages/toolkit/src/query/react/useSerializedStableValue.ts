import { useEffect, useRef, useMemo } from 'react'
import type { SerializeQueryArgs } from '@reduxjs/toolkit/dist/query/defaultSerializeQueryArgs'
import type { EndpointDefinition } from '@reduxjs/toolkit/dist/query/endpointDefinitions'
import { shallowEqual } from 'react-redux'
import produce from 'immer'
import type { QueryActionCreatorResult } from '../core/buildInitiate'
import type { SkipToken } from '../core/buildSelectors'
import { skipToken } from '../core/buildSelectors'

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

type CacheEntry<T, ExtraProps> = ExtraProps & {
  queryArgs: T
  serialized: string | T
}
type Cache<T, ExtraProps> = {
  [serialized: string]: CacheEntry<T, ExtraProps>
}

export function useQueryArgCache<T, ExtraProps>(
  queryArgsArray: Array<T>,
  serialize: SerializeQueryArgs<any>,
  endpointDefinition: EndpointDefinition<any, any, any, any>,
  endpointName: string
) {
  const lastCache = useRef<Cache<T, ExtraProps>>({})
  let cache: Cache<T, ExtraProps> = {}
  const lastCacheArray = useRef<Array<CacheEntry<T, ExtraProps>>>([])
  let cacheArray: Array<CacheEntry<T, ExtraProps>> = []

  for (const queryArgs of queryArgsArray) {
    const serialized =
      (queryArgs as any) === skipToken
        ? '____skipToken'
        : serialize({
            queryArgs,
            endpointDefinition,
            endpointName,
          })

    // @ts-ignore
    cache[serialized] = cache[serialized] ||
      lastCache.current[serialized] || {
        queryArgs,
        serialized,
      }
    cacheArray.push(cache[serialized])
  }

  if (shallowEqual(lastCache.current, cache)) {
    cache = lastCache.current
    cacheArray = lastCacheArray.current
  }

  useEffect(() => {
    lastCache.current = cache
    lastCacheArray.current = cacheArray
  })

  return { cache, lastCache: lastCache.current, cacheArray }
}
