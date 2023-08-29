import React from 'react'
import { shallowEqual } from 'react-redux'

export function useShallowStableValue<T>(ReactInstance: typeof React = React, value: T) {
  const cache = ReactInstance.useRef(value)
  ReactInstance.useEffect(() => {
    if (!shallowEqual(cache.current, value)) {
      cache.current = value
    }
  }, [value])

  return shallowEqual(cache.current, value) ? cache.current : value
}
