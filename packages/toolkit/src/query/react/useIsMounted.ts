import { useCallback, useLayoutEffect, useRef } from 'react'

export function useIsMounted(): () => boolean {
  const mountedRef = useRef(false)
  const get = useCallback(() => mountedRef.current, [])

  useLayoutEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  return get
}
