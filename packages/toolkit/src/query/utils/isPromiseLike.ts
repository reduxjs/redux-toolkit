/**
 * Thenable type guard.
 * @internal
 */
export const isPromiseLike = (val: unknown): val is PromiseLike<unknown> => {
  return (
    !!val && typeof val === 'object' && typeof (val as any).then === 'function'
  )
}
