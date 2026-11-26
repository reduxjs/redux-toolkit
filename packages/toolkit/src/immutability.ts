/**
 * Minimal immutability adapter used by `createReducer` and `createSlice`.
 *
 * Placeholder: the immutability adapter work replaces this file with the
 * full adapter layer (patch support, more adapters, conformance tests).
 * Keep everything adapter-related in this one module until then.
 */
import {
  current,
  isDraft,
  isDraftable,
  original,
  createNextState as produce,
} from './immerImports'
import type { Draft } from './draftTypes'

/**
 * Everything `createReducer` needs from an immutable-update library.
 *
 * - `isDraft`: is this value a draft we are already inside? Case reducers
 *   run directly on an existing draft instead of opening a new `produce`.
 * - `isDraftable`: can this value be drafted? When false, case reducers are
 *   called directly and must return the next state.
 * - `produce`: run a recipe against a draft of `base` and return the next
 *   state. The recipe may mutate the draft or return a replacement.
 * - `freezeDraftable`: deep-freeze a draftable value and return it. Adapters
 *   that do not freeze may return the value unchanged.
 * - `current` / `original`: for a draft, its current snapshot / the value it
 *   was created from; any other value is returned unchanged.
 */
export interface ImmutabilityAdapter {
  isDraft(value: unknown): boolean
  isDraftable(value: unknown): boolean
  produce<T>(base: T, recipe: (draft: Draft<T>) => T | Draft<T> | void): T
  freezeDraftable<T>(value: T): T
  current<T>(value: T | Draft<T>): T
  original<T>(value: T | Draft<T>): T
}

/**
 * The default adapter, backed by Immer.
 */
export const immerAdapter: ImmutabilityAdapter = {
  isDraft,
  isDraftable,
  produce: (base, recipe) => produce(base, recipe as any),
  freezeDraftable: (value) =>
    isDraftable(value) ? produce(value, () => {}) : value,
  current: (value) =>
    (isDraft(value) ? current(value as object) : value) as any,
  original: (value) =>
    (isDraft(value) ? original(value as object) : value) as any,
}

/**
 * An adapter with no drafting and no freezing. Case reducers must return
 * the next state, like a hand-written Redux reducer.
 */
export const noopAdapter: ImmutabilityAdapter = {
  isDraft: () => false,
  isDraftable: () => false,
  produce: (base, recipe) => {
    const result = recipe(base as Draft<typeof base>)
    return result === undefined ? base : (result as typeof base)
  },
  freezeDraftable: (value) => value,
  current: (value) => value as any,
  original: (value) => value as any,
}
