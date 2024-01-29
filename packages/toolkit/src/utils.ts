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
  comparator: (item: T) => boolean,
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
    items: Tuple<AdditionalItems>,
  ): Tuple<[...Items, ...AdditionalItems]>
  concat<AdditionalItems extends ReadonlyArray<unknown>>(
    items: AdditionalItems,
  ): Tuple<[...Items, ...AdditionalItems]>
  concat<AdditionalItems extends ReadonlyArray<unknown>>(
    ...items: AdditionalItems
  ): Tuple<[...Items, ...AdditionalItems]>
  concat(...arr: any[]) {
    return super.concat.apply(this, arr)
  }

  prepend<AdditionalItems extends ReadonlyArray<unknown>>(
    items: Tuple<AdditionalItems>,
  ): Tuple<[...AdditionalItems, ...Items]>
  prepend<AdditionalItems extends ReadonlyArray<unknown>>(
    items: AdditionalItems,
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

interface WeakMapEmplaceHandler<K extends object, V> {
  /**
   * Will be called to get value, if no value is currently in map.
   */
  insert?(key: K, map: WeakMap<K, V>): V
  /**
   * Will be called to update a value, if one exists already.
   */
  update?(previous: V, key: K, map: WeakMap<K, V>): V
}

interface MapEmplaceHandler<K, V> {
  /**
   * Will be called to get value, if no value is currently in map.
   */
  insert?(key: K, map: Map<K, V>): V
  /**
   * Will be called to update a value, if one exists already.
   */
  update?(previous: V, key: K, map: Map<K, V>): V
}

export function emplace<K, V>(
  map: Map<K, V>,
  key: K,
  handler: MapEmplaceHandler<K, V>,
): V
export function emplace<K extends object, V>(
  map: WeakMap<K, V>,
  key: K,
  handler: WeakMapEmplaceHandler<K, V>,
): V
/**
 * Allow inserting a new value, or updating an existing one
 * @throws if called for a key with no current value and no `insert` handler is provided
 * @returns current value in map (after insertion/updating)
 * ```ts
 * // return current value if already in map, otherwise initialise to 0 and return that
 * const num = emplace(map, key, {
 *   insert: () => 0
 * })
 *
 * // increase current value by one if already in map, otherwise initialise to 0
 * const num = emplace(map, key, {
 *   update: (n) => n + 1,
 *   insert: () => 0,
 * })
 *
 * // only update if value's already in the map - and increase it by one
 * if (map.has(key)) {
 *   const num = emplace(map, key, {
 *     update: (n) => n + 1,
 *   })
 * }
 * ```
 *
 * @remarks
 * Based on https://github.com/tc39/proposal-upsert currently in Stage 2 - maybe in a few years we'll be able to replace this with direct method calls
 */
export function emplace<K extends object, V>(
  map: WeakMap<K, V>,
  key: K,
  handler: WeakMapEmplaceHandler<K, V>,
): V {
  if (map.has(key)) {
    let value = map.get(key) as V
    if (handler.update) {
      value = handler.update(value, key, map)
      map.set(key, value)
    }
    return value
  }
  if (!handler.insert)
    throw new Error('No insert provided for key not already in map')
  const inserted = handler.insert(key, map)
  map.set(key, inserted)
  return inserted
}
