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
 * Opaque patches
 * ------------------------------------------------------------------------ */

declare const patchesBrand: unique symbol

/**
 * An opaque handle for a set of recorded changes, produced by
 * `produceWithPatches` and consumed by `applyPatches` *of the same adapter*.
 *
 * RTK Query's optimistic-update machinery needs to record the changes a
 * recipe made (as patches plus inverse patches), ship them through a
 * dispatched action, apply them inside a case reducer, and later apply the
 * inverse set to undo. None of that requires RTK to understand the patch
 * format — only that production and application are reciprocal. So the type
 * is branded and opaque: consumers can store patches and hand them back,
 * but cannot construct or inspect them without an unsafe cast. Immer and
 * Mutative both happen to use JSON-Patch-style `{op, path, value}` arrays,
 * but that is an implementation detail the contract deliberately does not
 * expose.
 *
 * The cost of opacity: 2.x RTKQ exposes Immer's `Patch` type in its public
 * `PatchCollection` API, so this design is a public break for anyone who
 * inspects or fabricates patches (rather than just passing them to `undo`).
 */
export interface Patches {
  readonly [patchesBrand]: 'rtk-immutability-patches'
}

/**
 * Optional patch recording/replay support for an adapter.
 *
 * - `produceWithPatches`: like `produce`, but also returns the recorded
 *   changes and their inverse. Must handle non-draftable bases (both Immer
 *   and Mutative natively emit a root-replace patch for those, so RTKQ's
 *   manual `isDraftable` fallback branch is unnecessary at this level).
 * - `applyPatches`: apply recorded changes to a base. When `base` is a
 *   draft (inside `produce`), the adapter mutates it in place and returns
 *   it; when `base` is a plain value, the adapter returns the next value.
 *   Reciprocity is the contract: `applyPatches(base, patches)` must equal
 *   the `next` that `produceWithPatches` returned, and
 *   `applyPatches(next, inversePatches)` must equal `base`.
 */
export interface ImmutabilityPatchSupport {
  produceWithPatches<T>(
    base: T,
    recipe: (draft: Draft<T>) => T | Draft<T> | void,
  ): readonly [next: T, patches: Patches, inversePatches: Patches]
  applyPatches<T>(base: T | Draft<T>, patches: Patches): T
}

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
 * - `current`: draft-safe snapshot. Given a draft, return a plain finalized
 *   copy of its current value; given anything else, return it unchanged.
 *   (Immer's and Mutative's own `current` throw on non-drafts; the adapter
 *   contract bakes in the `isDraft` guard that RTK Query's `getCurrent`
 *   helper adds today.)
 * - `original`: given a draft, return the original value it was created
 *   from (RTKQ uses this for structural sharing against the pre-update
 *   cache entry); given anything else, return it unchanged. Same guarded
 *   contract as `current`.
 * - `patches`: optional patch recording/replay support. Only needed by
 *   consumers that do optimistic updates (RTK Query). Kept optional so the
 *   default `createSlice`/`createReducer` path never references it — with
 *   Immer, merely referencing `enablePatches` pulls the patch plugin into
 *   the bundle.
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
  current: (value) => value as any,
  original: (value) => value as any,
}

/**
 * The no-op adapter with whole-value snapshot patches. There is no draft
 * tracking, so "patches" are just the full next (or previous) value:
 * `produceWithPatches` runs the recipe directly and records snapshots of
 * the result and the base; `applyPatches` ignores the base and returns the
 * snapshot. That trivially satisfies the reciprocity contract — and is the
 * existence proof that *any* immutable-update strategy can implement patch
 * support behind the opaque type, at the cost of shipping whole values
 * where Immer/Mutative ship granular diffs.
 */
export const noopAdapterWithPatches: ImmutabilityAdapter =
  /* @__PURE__ */ ((): ImmutabilityAdapter => ({
    ...noopAdapter,
    patches: {
      produceWithPatches: (base, recipe) => {
        const result = recipe(base as Draft<typeof base>)
        const next = (result === undefined ? base : result) as typeof base
        return [next, snapshotPatch(next), snapshotPatch(base)]
      },
      applyPatches: (base, patches) =>
        (patches as unknown as SnapshotPatch).value as any,
    },
  }))()

type SnapshotPatch = { value: unknown }

function snapshotPatch(value: unknown): Patches {
  return { value } as unknown as Patches
}
