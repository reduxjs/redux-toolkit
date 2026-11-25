import {
  applyPatches,
  current,
  enablePatches,
  isDraft,
  isDraftable,
  original,
  produce,
  produceWithPatches,
} from 'immer'
import type { Draft } from '../draftTypes'
import type { ImmutabilityAdapter, Patch } from './adapter'

type Recipe<T> = (draft: Draft<T>) => T | Draft<T> | void

/**
 * The default immutability adapter, backed by Immer. It has no patch
 * support; use `immerAdapterWithPatches` where patches are needed.
 *
 * Immer only drafts `Map` and `Set` after the app calls Immer's
 * `enableMapSet()`. The adapter does not call it, so apps that keep Maps or
 * Sets in state opt in themselves.
 *
 * @since 3.0.0
 */
export const immerAdapter: ImmutabilityAdapter = {
  isDraft,
  isDraftable,
  produce: <T>(base: T, recipe: Recipe<T>) =>
    produce(base, recipe as (draft: Draft<T>) => void) as T,
  // Producing with an empty recipe deep-freezes the base in place.
  freezeDraftable: (value) =>
    isDraftable(value) ? produce(value, () => {}) : value,
  current: <T>(value: T | Draft<T>) =>
    (isDraft(value) ? current(value as object) : value) as T,
  original: <T>(value: T | Draft<T>) =>
    (isDraft(value) ? original(value as object) : value) as T,
}

let patchesEnabled = false
function ensurePatchesEnabled() {
  if (!patchesEnabled) {
    enablePatches()
    patchesEnabled = true
  }
}

/**
 * The Immer adapter with patch support. Referencing Immer's `enablePatches`
 * keeps its patch plugin in the bundle, so patch support is a separate
 * adapter. The `@__PURE__` IIFE lets bundlers drop it when unused: a
 * top-level object spread is not provably free of side effects.
 *
 * @since 3.0.0
 */
export const immerAdapterWithPatches: ImmutabilityAdapter =
  /* @__PURE__ */ ((): ImmutabilityAdapter => ({
    ...immerAdapter,
    patches: {
      produceWithPatches: <T>(base: T, recipe: Recipe<T>) => {
        ensurePatchesEnabled()
        return produceWithPatches(
          base,
          recipe as (draft: Draft<T>) => void,
        ) as unknown as readonly [T, Patch[], Patch[]]
      },
      applyPatches: <T>(base: T | Draft<T>, patches: readonly Patch[]) => {
        ensurePatchesEnabled()
        // Immer does not modify the patch array, but its type wants a
        // mutable one.
        return applyPatches(base as object, patches.slice()) as T
      },
    },
  }))()
