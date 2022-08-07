import { isPromiseLike } from '../utils/promise'

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

const getSuspendable = (suspendable: Suspendable) => {
  return suspendable.getSuspendablePromise()
}

export function useSuspendAll<
  T extends ReadonlyArray<SuspendableResource<any>>
>(...suspendables: T): UseSuspendAllOutput<T> {
  let promises = suspendables
    .map(getSuspendable)
    .filter(isPromiseLike) as Promise<unknown>[]

  if (promises.length) {
    throw Promise.all(promises)
  }

  return suspendables as UseSuspendAllOutput<T>
}
