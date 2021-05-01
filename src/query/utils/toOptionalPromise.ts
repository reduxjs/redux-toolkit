/**
 * A promise that will only throw if it has been interacted with, by calling `.then` or `.catch` on it,
 * or by `await`ing it.
 *
 * This deals with unhandled promise rejections if the promise was never interacted with in any way.
 *
 * No interaction with the Promise => no error
 */
export interface OptionalPromise<T> extends Promise<T> {}

/**
 * Wraps a Promise in a new Promise that will only throw, if either `.then` or `.catch` have been accessed on it prior to throwing.
 */
export function toOptionalPromise<T>(promise: Promise<T>): OptionalPromise<T> {
  let interacted = false
  const wrapped = promise.catch((e) => {
    if (interacted) throw e
  })
  const { then } = wrapped
  wrapped.then = (...args) => {
    interacted = true
    return then.apply(wrapped, args) as any
  }
  return wrapped as Promise<T>
}
