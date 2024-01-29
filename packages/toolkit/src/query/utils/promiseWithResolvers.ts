import { safeAssign } from '../tsHelpers'

export interface PromiseConstructorWithKnownReason {
  /**
   * Creates a new Promise with a known rejection reason.
   * @param executor A callback used to initialize the promise. This callback is passed two arguments:
   * a resolve callback used to resolve the promise with a value or the result of another promise,
   * and a reject callback used to reject the promise with a provided reason or error.
   */
  new <T, R>(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason: R) => void,
    ) => void,
  ): PromiseWithKnownReason<T, R>
}

export interface PromiseWithKnownReason<T, R>
  extends Omit<Promise<T>, 'then' | 'catch'> {
  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param onfulfilled The callback to execute when the Promise is resolved.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: R) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2>

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?:
      | ((reason: R) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<T | TResult>
}

export const PromiseWithKnownReason =
  Promise as PromiseConstructorWithKnownReason

type PromiseExecutor<T, R> = ConstructorParameters<
  typeof PromiseWithKnownReason<T, R>
>[0]

export type PromiseWithResolvers<T, R> = {
  promise: PromiseWithKnownReason<T, R>
  resolve: Parameters<PromiseExecutor<T, R>>[0]
  reject: Parameters<PromiseExecutor<T, R>>[1]
}

export const promiseWithResolvers = <T, R = unknown>(): PromiseWithResolvers<
  T,
  R
> => {
  const result = {} as PromiseWithResolvers<T, R>
  result.promise = new PromiseWithKnownReason<T, R>((resolve, reject) => {
    safeAssign(result, { reject, resolve })
  })
  return result
}
