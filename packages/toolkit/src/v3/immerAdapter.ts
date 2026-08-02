import { isDraft, isDraftable, produce } from 'immer'
import type { ImmutabilityAdapter } from './immutability'

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
}
