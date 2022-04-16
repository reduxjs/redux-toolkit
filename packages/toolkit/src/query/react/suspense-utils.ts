export interface Resource<Data> {
  data?: Data | undefined
  isLoading?: boolean
}

export interface IdleResource<Data> extends Resource<Data> {
  isSkipped: true
}

export interface Suspendable {
  getSuspendablePromise(): Promise<unknown> | undefined
}

export type SuspendableResource<Data> = Resource<Data> & Suspendable

export type IdleSuspendableResource<Data> = IdleResource<Data> & Suspendable

export type ResolvedSuspendableResource<T> = T extends SuspendableResource<
  infer Data
>
  ? Omit<T, 'isLoading' | 'data'> & {
      data: Exclude<Data, undefined>
      isLoading: false
    }
  : never

export type UseSuspendAllOutput<Sus extends readonly unknown[]> = {
  [K in keyof Sus]: Sus[K] extends IdleSuspendableResource<any>
    ? Sus[K]
    : Sus[K] extends SuspendableResource<any>
    ? ResolvedSuspendableResource<Sus[K]>
    : Sus[K] extends Suspendable
    ? Sus[K]
    : never
}

function isPromiseLike(val: unknown): val is PromiseLike<unknown> {
  return (
    !!val && typeof val === 'object' && typeof (val as any).then === 'function'
  )
}

function getSuspendable(suspendable: Suspendable) {
  return suspendable.getSuspendablePromise()
}

export function useSuspendAll<
  G extends SuspendableResource<any>,
  T extends SuspendableResource<any>[]
>(
  ...suspendables: readonly [G, ...T]
): UseSuspendAllOutput<readonly [G, ...T]> {
  if (!suspendables.length) {
    throw new TypeError('useSuspendAll: requires one or more arguments')
  }

  let promises = suspendables
    .map(getSuspendable)
    .filter(isPromiseLike) as Promise<unknown>[]

  if (promises.length) {
    throw Promise.all(promises)
  }

  return suspendables as UseSuspendAllOutput<readonly [G, ...T]>
}
