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
import type { Patch } from 'immer'
import type { ImmutabilityAdapter, Patches } from './immutability'

/**
 * The default immutability adapter, backed by Immer. This module is the only
 * v3 file with a runtime `immer` import: `index.ts` binds it into the
 * prebuilt `createSlice` behind a `@__PURE__` annotation, so building your
 * own `createSlice` with a different adapter should let bundlers drop Immer
 * entirely.
 *
 * `freezeDraftable` uses the same empty-produce trick as 2.x
 * `utils.ts`: producing with an empty recipe deep-freezes the base in place
 * (Immer's auto-freeze) and returns it.
 */
export const immerAdapter: ImmutabilityAdapter = {
  isDraft,
  isDraftable,
  produce: (base, recipe) => produce(base, recipe as any),
  freezeDraftable: (value) =>
    isDraftable(value) ? produce(value, () => {}) : value,
  current: (value) => (isDraft(value) ? current(value) : value) as any,
  original: (value) => (isDraft(value) ? original(value) : value) as any,
}

/**
 * Immer's patch support lives behind `enablePatches()`, and *referencing*
 * that function is what keeps the plugin code in a bundle (immer is a
 * single side-effect-free module; unreferenced exports tree-shake). So
 * patch support is a separate adapter object rather than part of
 * `immerAdapter`: the default `createSlice`/`createReducer` bindings never
 * touch it, and only consumers that need optimistic updates (RTK Query) pay
 * for the plugin. Registration itself happens lazily on first use, mirroring
 * 2.x RTKQ, which calls `enablePatches()` once at `createApi` module init
 * (query/core/module.ts:552).
 *
 * `applyPatches` copies the patch array before applying because the patches
 * may arrive frozen or typed readonly (2.x buildSlice does the same with
 * `patches.concat()`).
 *
 * The `@__PURE__` IIFE matters: a top-level object *spread* is not provably
 * side-effect-free (spreading can trigger getters), so without it both
 * esbuild and Rollup retain this adapter — and with it Immer's patch
 * plugin — in bundles that never use it. (Same pattern as 2.x
 * `createAsyncThunk`.)
 */
export const immerAdapterWithPatches: ImmutabilityAdapter =
  /* @__PURE__ */ ((): ImmutabilityAdapter => ({
  ...immerAdapter,
  patches: {
    produceWithPatches: (base, recipe) => {
      ensurePatchesEnabled()
      const [next, patches, inversePatches] = produceWithPatches(
        base,
        recipe as any,
      )
      return [
        next as typeof base,
        patches as unknown as Patches,
        inversePatches as unknown as Patches,
      ]
    },
    applyPatches: (base, patches) => {
      ensurePatchesEnabled()
      return applyPatches(
        base as any,
        (patches as unknown as readonly Patch[]).slice(),
      )
    },
  },
}))()

let patchesEnabled = false
function ensurePatchesEnabled() {
  if (!patchesEnabled) {
    enablePatches()
    patchesEnabled = true
  }
}
