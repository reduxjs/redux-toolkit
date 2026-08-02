/**
 * RTK 3.0 immutability adapter seam.
 *
 * RTK 2.x is coupled to Immer three ways:
 * - runtime: `createReducer` imports `produce`/`isDraft`/`isDraftable`
 *   directly (via `immerImports.ts`)
 * - type-level: the public `CaseReducer` signature uses Immer's `Draft<S>`
 * - behavioral: auto-freezing of draftable state
 *
 * This module breaks the first two. The `ImmutabilityAdapter` interface is
 * the complete runtime contract `createReducer` needs, and the `Draft` type
 * below is an RTK-owned structural copy of Immer's `Draft` (a type-equality
 * test guards against drift), so no public v3 signature imports from
 * `immer`.
 *
 * Provisioning: adapters are bundle-weight, not type-weight, so they bind at
 * *builder* level (`buildCreateSlice({ immutability })`) with a per-slice
 * `immutability` option override — the opposite of custom creators, which
 * are type-heavy but bundle-light and therefore bind per call. The main
 * entry point exports a prebuilt `createSlice` bound to the Immer adapter
 * behind a `@__PURE__` annotation, so apps that build their own
 * `createSlice` with a different adapter should not pay for Immer.
 *
 * Behavioral semantics (auto-freeze, mutate-vs-return rules) remain
 * whatever the chosen adapter implements. With `noopAdapter` there is no
 * drafting and no freezing: case reducers must return the next state
 * themselves, and the type-level `Draft<S>` "safe to mutate" claim is no
 * longer backed by anything at runtime. That trade is explicitly on the
 * user.
 */

/* ---------------------------------------------------------------------------
 * RTK-owned Draft type. Structural copy of Immer 11's `Draft`
 * (immer/dist/immer.d.ts), so the two are mutually assignable.
 * ------------------------------------------------------------------------ */

type PrimitiveType = number | string | boolean

/** Object types that should never be mapped */
type AtomicObject = Function | Promise<any> | Date | RegExp

/**
 * If the lib "ES2015.Collection" is not included in tsconfig.json,
 * types like ReadonlyArray, WeakMap etc. fall back to `any` (specified nowhere)
 * or `{}` (from the node types), in both cases entering an infinite recursion.
 * Hence, this defensive check.
 */
type IfAvailable<T, Fallback = void> = true | false extends (
  T extends never ? true : false
)
  ? Fallback
  : keyof T extends never
    ? Fallback
    : T

/**
 * These should also never be mapped but must be tested after regular Map and
 * Set
 */
type WeakReferences = IfAvailable<WeakMap<any, any>> | IfAvailable<WeakSet<any>>

export type WritableDraft<T> = {
  -readonly [K in keyof T]: Draft<T[K]>
}

/** Convert a readonly type into a mutable type, if possible */
export type Draft<T> = T extends PrimitiveType
  ? T
  : T extends AtomicObject
    ? T
    : T extends ReadonlyMap<infer K, infer V> // Map extends ReadonlyMap
      ? Map<Draft<K>, Draft<V>>
      : T extends ReadonlySet<infer V> // Set extends ReadonlySet
        ? Set<Draft<V>>
        : T extends WeakReferences
          ? T
          : T extends object
            ? WritableDraft<T>
            : T

/* ---------------------------------------------------------------------------
 * The runtime adapter contract
 * ------------------------------------------------------------------------ */

/**
 * Everything `createReducer` needs from an immutable-update library.
 *
 * - `isDraft`: is this value a draft we are already inside? (When true, case
 *   reducers are called directly on it instead of opening a new `produce`.)
 * - `isDraftable`: can this value be drafted at all? When false,
 *   `createReducer` calls the case reducer directly and requires it to
 *   return the next state, and `freezeDraftable` leaves the value alone.
 * - `produce`: run a recipe against a draft of `base` and return the next
 *   state. The recipe may mutate the draft and return `undefined`, or return
 *   a replacement state.
 * - `freezeDraftable`: deep-freeze a draftable value (used on initial
 *   state), returning it. Adapters that do not freeze may make this an
 *   identity function.
 */
export interface ImmutabilityAdapter {
  isDraft(value: unknown): boolean
  isDraftable(value: unknown): boolean
  produce<T>(base: T, recipe: (draft: Draft<T>) => T | Draft<T> | void): T
  freezeDraftable<T>(value: T): T
}

/* ---------------------------------------------------------------------------
 * The no-op adapter
 * ------------------------------------------------------------------------ */

/**
 * An adapter that performs no drafting and no freezing: hand-written
 * immutability. `isDraftable` is always false, which routes every case
 * reducer through `createReducer`'s direct-call branch — reducers must
 * return the next state (returning `undefined` throws, except for `null`
 * state), exactly like a hand-written Redux reducer. Nothing is frozen, and
 * accidental mutation is not detected.
 */
export const noopAdapter: ImmutabilityAdapter = {
  isDraft: () => false,
  isDraftable: () => false,
  produce: (base, recipe) => {
    const result = recipe(base as Draft<typeof base>)
    return result === undefined ? base : (result as typeof base)
  },
  freezeDraftable: (value) => value,
}
