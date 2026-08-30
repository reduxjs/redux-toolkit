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
    cleanup: () => clearTimeout(timeoutId),
  }
}

// AbortSignal.any() is currently baseline 2024
export const anySignal = (...signals: AbortSignal[]) => {
  // if any are already aborted, return an already aborted signal
  for (const signal of signals)
    if (signal.aborted) {
      return { signal: AbortSignal.abort(signal.reason), cleanup: () => {} }
    }

  // otherwise, create a new signal that aborts when any of the given signals abort
  const abortController = new AbortController()
  const listeners = new Map<AbortSignal, () => void>()
  const cleanup = () => {
    for (const [signal, listener] of listeners) {
      signal.removeEventListener('abort', listener)
    }
    listeners.clear()
  }
  for (const signal of signals) {
    const listener = () => {
      cleanup()
      abortController.abort(signal.reason)
    }
    listeners.set(signal, listener)
    signal.addEventListener('abort', listener, { once: true })
  }
  return { signal: abortController.signal, cleanup }
}
