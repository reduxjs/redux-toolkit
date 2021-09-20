import { useRef, useEffect } from 'react'

/**
 * Monitors the 'stability' of the provided value across renders.
 * If the value changes more times than the threshold within the provided
 * time delta, an error will be through.
 *
 * Defaults to throwing if changing 10 times in 10 consecutive renders within 1000ms
 */
export function useStabilityMonitor<T>(
  value: T,
  {
    delta = 1000,
    threshold = 10,
    errMsg = 'Value changed too many times.',
  } = {}
) {
  const lastValue = useRef(value)
  const consecutiveTimestamps = useRef<number[]>([])

  useEffect(() => {
    // where a render occurs but value didn't change, consider the value to be 'stable'
    // and clear recorded timestamps.
    // i.e. only keep timestamps if the value changes every render
    if (lastValue.current === value) consecutiveTimestamps.current = []
    lastValue.current = value
  })

  useEffect(() => {
    const now = Date.now()
    consecutiveTimestamps.current.push(now)
    consecutiveTimestamps.current = consecutiveTimestamps.current.filter((timestamp) => {
      return timestamp > now - delta
    })

    if (consecutiveTimestamps.current.length >= threshold) {
      const err = new Error(errMsg)
      Error.captureStackTrace(err, useStabilityMonitor)
      throw err
    }
  }, [value, delta, threshold, errMsg])
}
