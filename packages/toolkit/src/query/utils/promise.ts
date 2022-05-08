/**
 * Thenable type guard.
 * @internal
 */
export const isPromiseLike = (val: unknown): val is PromiseLike<unknown> => {
  return (
    !!val && typeof val === 'object' && typeof (val as any).then === 'function'
  )
}

export const noop = () => {}

/**
 * Adds a catch callback to `promise` then returns it.
 * @internal 
 */
export const catchRejection = <T extends Pick<Promise<any>, 'catch'>>(
  promise: T,
  onError = noop
): T => {
  promise.catch(onError)

  return promise
}