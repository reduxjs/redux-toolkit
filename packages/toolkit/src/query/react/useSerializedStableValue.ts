import { copyWithStructuralSharing } from '@reduxjs/toolkit/query'
import { useEffect, useMemo, useRef } from 'react'

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
