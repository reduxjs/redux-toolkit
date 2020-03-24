export function getTimeMeasureUtils(maxDelay: number, fnName: string) {
  let elapsed = 0
  return {
    measureTime<T>(fn: () => T): T {
      const started = Date.now()
      try {
        return fn()
      } finally {
        const finished = Date.now()
        elapsed += finished - started
      }
    },
    warnIfExceeded() {
      if (elapsed > maxDelay) {
        console.warn(`${fnName} took ${elapsed}ms, which is more than the warning threshold of ${maxDelay}ms. 
If your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.
It is disabled in production builds, so you don't need to worry about that.`)
      }
    }
  }
}
