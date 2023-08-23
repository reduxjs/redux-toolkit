import { produce as createNextState, isDraftable } from 'immer'
import type { Middleware, StoreEnhancer } from 'redux'

export function getTimeMeasureUtils(maxDelay: number, fnName: string) {
  let elapsed = 0
  return {
    measureTime<T>(fn: () => T): T {
      const started = Date.now()
      try {
        return fn()
      } finally {
        const finished = Date.now()
        elapsed += finished - started
      }
    },
    warnIfExceeded() {
      if (elapsed > maxDelay) {
        console.warn(`${fnName} took ${elapsed}ms, which is more than the warning threshold of ${maxDelay}ms. 
If your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.
It is disabled in production builds, so you don't need to worry about that.`)
      }
    },
  }
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function find<T>(
  iterable: Iterable<T>,
  comparator: (item: T) => boolean
): T | undefined {
  for (const entry of iterable) {
    if (comparator(entry)) {
      return entry
    }
  }

  return undefined
}

export class Tuple<Items extends ReadonlyArray<unknown> = []> extends Array<
  Items[number]
> {
  constructor(length: number)
  constructor(...items: Items)
  constructor(...items: any[]) {
    super(...items)
    Object.setPrototypeOf(this, Tuple.prototype)
  }

  static get [Symbol.species]() {
    return Tuple as any
  }

  concat<AdditionalItems extends ReadonlyArray<unknown>>(
    items: Tuple<AdditionalItems>
  ): Tuple<[...Items, ...AdditionalItems]>
  concat<AdditionalItems extends ReadonlyArray<unknown>>(
    items: AdditionalItems
  ): Tuple<[...Items, ...AdditionalItems]>
  concat<AdditionalItems extends ReadonlyArray<unknown>>(
    ...items: AdditionalItems
  ): Tuple<[...Items, ...AdditionalItems]>
  concat(...arr: any[]) {
    return super.concat.apply(this, arr)
  }

  prepend<AdditionalItems extends ReadonlyArray<unknown>>(
    items: Tuple<AdditionalItems>
  ): Tuple<[...AdditionalItems, ...Items]>
  prepend<AdditionalItems extends ReadonlyArray<unknown>>(
    items: AdditionalItems
  ): Tuple<[...AdditionalItems, ...Items]>
  prepend<AdditionalItems extends ReadonlyArray<unknown>>(
    ...items: AdditionalItems
  ): Tuple<[...AdditionalItems, ...Items]>
  prepend(...arr: any[]) {
    if (arr.length === 1 && Array.isArray(arr[0])) {
      return new Tuple(...arr[0].concat(this))
    }
    return new Tuple(...arr.concat(this))
  }
}

export function freezeDraftable<T>(val: T) {
  return isDraftable(val) ? createNextState(val, () => {}) : val
}

export function capitalize(str: string) {
  return str.replace(str[0], str[0].toUpperCase())
}
