import type { Options } from 'mutative'
import {
  apply,
  create,
  current,
  isDraft,
  isDraftable,
  original,
  rawReturn,
} from 'mutative'
import type { Draft } from '../../draftTypes'
import type { ImmutabilityAdapter, Patch } from '../adapter'

type Recipe<T> = (draft: Draft<T>) => T | Draft<T> | void

// Mutative only drafts objects whose prototype is `Object.prototype`.
// Marking null-prototype objects as immutable data makes them draftable,
// matching Immer.
const mark: NonNullable<Options<boolean, true>['mark']> = (target: unknown) =>
  typeof target === 'object' &&
  target !== null &&
  Object.getPrototypeOf(target) === null
    ? 'immutable'
    : undefined

const markOptions = { mark }

const createOptions: Options<false, true> = {
  mark,
  enableAutoFreeze: true,
}

const createWithPatchesOptions: Options<true, true> = {
  mark,
  enableAutoFreeze: true,
  enablePatches: true,
}

const containsDraft = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false
  if (isDraft(value)) return true
  // Finalized state is frozen, and a frozen object cannot hold a draft.
  if (Object.isFrozen(value)) return false
  if (value instanceof Map) {
    for (const [key, entry] of value) {
      if (containsDraft(key) || containsDraft(entry)) return true
    }
    return false
  }
  if (value instanceof Set) {
    for (const entry of value) {
      if (containsDraft(entry)) return true
    }
    return false
  }
  for (const key of Object.keys(value)) {
    if (containsDraft((value as Record<string, unknown>)[key])) return true
  }
  return false
}

// Mutative warns when a recipe returns an object without drafts unless it is
// wrapped in `rawReturn`, and warns again if a wrapped value holds drafts.
// RTK recipes return both kinds, so the adapter checks and wraps.
const wrapRecipe =
  <T>(recipe: Recipe<T>) =>
  (draft: Draft<T>) => {
    const result = recipe(draft)
    if (
      result !== undefined &&
      result !== draft &&
      typeof result === 'object' &&
      result !== null &&
      !containsDraft(result)
    ) {
      return rawReturn(result)
    }
    return result
  }

const deepFreeze = (value: unknown): void => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return
  }
  Object.freeze(value)
  if (value instanceof Map) {
    for (const [key, entry] of value) {
      deepFreeze(key)
      deepFreeze(entry)
    }
  } else if (value instanceof Set) {
    for (const entry of value) {
      deepFreeze(entry)
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
}

const isMutativeDraftable = (value: unknown) => isDraftable(value, markOptions)

export const mutativeAdapter: ImmutabilityAdapter = {
  isDraft,
  isDraftable: isMutativeDraftable,
  produce: <T>(base: T, recipe: Recipe<T>) =>
    create(
      base as object,
      wrapRecipe(recipe) as (draft: object) => void,
      createOptions,
    ) as T,
  freezeDraftable: (value) => {
    if (isMutativeDraftable(value)) deepFreeze(value)
    return value
  },
  current: <T>(value: T | Draft<T>) =>
    (isDraft(value) ? current(value as object) : value) as T,
  original: <T>(value: T | Draft<T>) =>
    (isDraft(value) ? original(value as object) : value) as T,
}

export const mutativeAdapterWithPatches: ImmutabilityAdapter = {
  ...mutativeAdapter,
  patches: {
    produceWithPatches: <T>(base: T, recipe: Recipe<T>) =>
      create(
        base as object,
        wrapRecipe(recipe) as (draft: object) => void,
        createWithPatchesOptions,
      ) as unknown as readonly [T, Patch[], Patch[]],
    // Mutative refuses options when the base is a draft. The enclosing
    // `create` call already owns marking and freezing in that case.
    applyPatches: <T>(base: T | Draft<T>, patches: readonly Patch[]) =>
      (isDraft(base)
        ? apply(base as object, patches as Patch[])
        : apply<object, true>(base as object, patches as Patch[], {
            mark,
            enableAutoFreeze: true,
          })) as T,
  },
}
