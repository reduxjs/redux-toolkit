/**
 * A promise that will only throw if it has been interacted with, by calling `.then` or `.catch` on it,
 * or by `await`ing it.
 *
 * This deals with unhandled promise rejections if the promise was never interacted with in any way.
 *
 * No interaction with the Promise => no error
 */
export interface OptionalPromise<T>
  extends Pick<Promise<T>, 'then' | 'catch' | 'finally'> {}

/**
 * Wraps a Promise in a new Promise that will only throw, if either `.then` or `.catch` have been accessed on it prior to throwing.
 */
export function toOptionalPromise<T>(promise: Promise<T>): OptionalPromise<T> {
  let interacted = false
  const wrapped = promise.catch((e) => {
    if (interacted) throw e
  })
  return {
    then(onresolve: any, onreject) {
      interacted = true
      return wrapped.then(onresolve, onreject) as any
    },
    catch(onreject) {
      interacted = true
      return wrapped.catch(onreject) as any
    },
    finally(cb) {
      interacted = true
      return wrapped.finally(cb) as any
    },
  }
}
