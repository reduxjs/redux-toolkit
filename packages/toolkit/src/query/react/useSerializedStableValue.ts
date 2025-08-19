import { useEffect, useRef, useMemo } from 'react'
import { copyWithStructuralSharing } from '@reduxjs/toolkit/query'

export function useStableQueryArgs<T>(queryArgs: T) {
  const cache = useRef(queryArgs)
  const copy = useMemo(
    () => copyWithStructuralSharing(cache.current, queryArgs),
    [queryArgs],
  )
  useEffect(() => {
    if (cache.current !== copy) {
      cache.current = copy
    }
  }, [copy])

  return copy
}
