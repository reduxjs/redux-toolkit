import type { Draft } from '../draftTypes'

/**
 * One recorded change, in the JSON-Patch-like format RTK owns.
 *
 * `path` is an array of keys from the root of the value the patch applies
 * to; `[]` addresses the root itself. Array indices are numbers. Map keys
 * and Set entries use the same `path` positions their library uses, so
 * Map/Set patches are only portable between adapters that agree on them.
 *
 * Adapters must both produce and accept this format, because RTK Query
 * builds some patches by hand (subscription sync) and applies patches it
 * did not produce (`patchQueryData` from user code).
 *
 * @since 3.0.0
 */
export interface Patch {
  op: 'add' | 'remove' | 'replace'
  path: (string | number)[]
  // RTK Query re-exports this type; its `Patch` has had this shape since 2.14.0.
  value?: any
}

/**
 * Optional patch recording and replay support for an adapter.
 *
 * - `produceWithPatches`: like `produce`, but also returns the recorded
 *   changes and their inverse.
 * - `applyPatches`: apply patches to a base. When `base` is a draft (inside
 *   `produce`), the adapter mutates it in place and returns it. Otherwise it
 *   returns the next value and leaves `base` untouched. A `replace` patch
 *   with path `[]` replaces the whole value: the replacement is returned and
 *   a draft base is not mutated. Callers must always use the return value.
 *
 * `applyPatches(base, patches)` must equal the `next` that
 * `produceWithPatches` returned, and `applyPatches(next, inversePatches)`
 * must equal `base`.
 *
 * @since 3.0.0
 */
export interface ImmutabilityPatchSupport {
  produceWithPatches<T>(
    base: T,
    recipe: (draft: Draft<T>) => T | Draft<T> | void,
  ): readonly [next: T, patches: Patch[], inversePatches: Patch[]]
  applyPatches<T>(base: T | Draft<T>, patches: readonly Patch[]): T
}

/**
 * Everything RTK needs from an immutable-update library.
 *
 * - `isDraft`: is this value a draft we are already inside?
 * - `isDraftable`: will `produce` draft this value? For primitives, `produce`
 *   hands the value itself to the recipe, which must return the next value.
 *   For non-draftable objects (class instances, `Date`), `produce` may throw,
 *   as Immer and Mutative do, so callers must check `isDraftable` before
 *   producing over an object. `noopAdapter` drafts nothing and passes every
 *   value to the recipe as is.
 * - `produce`: run a recipe against a draft of `base` and return the next
 *   value. The recipe may mutate the draft and return `undefined`, or return
 *   a replacement value.
 * - `freezeDraftable`: deep-freeze a draftable value and return it. Adapters
 *   that do not freeze may return the value unchanged.
 * - `current`: given a draft, return a plain snapshot of its current value.
 *   Given anything else, return it unchanged.
 * - `original`: given a draft, return the value it was created from. Given
 *   anything else, return it unchanged.
 * - `patches`: optional. Only RTK Query needs it, and `createApi` throws if
 *   its adapter lacks it. It is a separate member so that code paths that
 *   never touch patches do not pull a patch implementation into the bundle.
 *
 * @since 3.0.0
 */
export interface ImmutabilityAdapter {
  isDraft(value: unknown): boolean
  isDraftable(value: unknown): boolean
  produce<T>(base: T, recipe: (draft: Draft<T>) => T | Draft<T> | void): T
  freezeDraftable<T>(value: T): T
  current<T>(value: T | Draft<T>): T
  original<T>(value: T | Draft<T>): T
  patches?: ImmutabilityPatchSupport
}

/**
 * An adapter that does no drafting and no freezing. Nothing is draftable,
 * so every recipe receives the real value and must return the next value
 * itself, as in a hand-written reducer. Mutations are not detected.
 *
 * It has no patch support, so it cannot be used with RTK Query.
 *
 * @since 3.0.0
 */
export const noopAdapter: ImmutabilityAdapter = {
  isDraft: () => false,
  isDraftable: () => false,
  produce: (base, recipe) => {
    const result = recipe(base as Draft<typeof base>)
    return (result === undefined ? base : result) as typeof base
  },
  freezeDraftable: (value) => value,
  current: <T>(value: T | Draft<T>) => value as T,
  original: <T>(value: T | Draft<T>) => value as T,
}
