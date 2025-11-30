// AbortSignal.timeout() is currently baseline 2024
export const timeoutSignal = (milliseconds: number) => {
  const abortController = new AbortController()
  setTimeout(
    () => abortController.abort(new DOMException('', 'TimeoutError')),
    milliseconds,
  )
  return abortController.signal
}

// AbortSignal.any() is currently baseline 2024
export const anySignal = (...signals: AbortSignal[]) => {
  // if any are already aborted, return an already aborted signal
  for (const signal of signals)
    if (signal.aborted) return AbortSignal.abort(signal.reason)

  // otherwise, create a new signal that aborts when any of the given signals abort
  const abortController = new AbortController()
  for (const signal of signals) {
    signal.addEventListener(
      'abort',
      () => abortController.abort(signal.reason),
      { signal: abortController.signal, once: true },
    )
  }
  return abortController.signal
}
