// AbortSignal.timeout() is currently baseline 2024
export const timeoutSignal = (milliseconds: number) => {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    const message = 'signal timed out'
    const name = 'TimeoutError'
    abortController.abort(
      // some environments (React Native, Node) don't have DOMException
      typeof DOMException !== 'undefined'
        ? new DOMException(message, name)
        : Object.assign(new Error(message), { name }),
    )
  }, milliseconds)
  return {
    signal: abortController.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

// AbortSignal.any() is currently baseline 2024
export const anySignal = (...signals: AbortSignal[]) => {
  // if any are already aborted, return an already aborted signal
  for (const signal of signals)
    if (signal.aborted)
      return { signal: AbortSignal.abort(signal.reason), clear: () => {} }

  // otherwise, create a new signal that aborts when any of the given signals abort
  const abortController = new AbortController()
  const onAbort = (event: Event) =>
    abortController.abort((event.target as AbortSignal).reason)
  for (const signal of signals) {
    signal.addEventListener('abort', onAbort, {
      signal: abortController.signal,
      once: true,
    })
  }
  return {
    signal: abortController.signal,
    clear: () =>
      signals.forEach((signal) => signal.removeEventListener('abort', onAbort)),
  }
}
