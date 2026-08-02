import { create, isDraft, isDraftable } from 'mutative'
import type { ImmutabilityAdapter } from './immutability'

/**
 * Immutability adapter backed by Mutative.
 *
 * In the real 3.0 design this would live in a separate entry point (or
 * package) so `mutative` is only a dependency for apps that use it. In this
 * spike it is deliberately NOT exported from `./index` for the same reason.
 *
 * Semantics notes, verified against mutative 1.3.0:
 * - `enableAutoFreeze: true` matches RTK's always-freeze behavior (Mutative
 *   defaults to no freezing).
 * - Case reducers that RETURN a fresh draft-free object (rather than
 *   mutating the draft) trigger Mutative's unconditional console warning
 *   suggesting `rawReturn()`. The adapter cannot apply `rawReturn` itself:
 *   a returned object may contain nested drafts, and `rawReturn` skips the
 *   draft finalization pass, which would leak revoked proxies into state.
 *   (Primitive returns never warn.) Users who return fresh draft-free
 *   objects can wrap them in `rawReturn()` inside their own case reducer
 *   to silence the warning.
 * - `freezeDraftable` deep-freezes manually instead of using the 2.x
 *   empty-produce trick, because an empty recipe also triggers the
 *   `rawReturn` warning.
 */

const deepFreeze = (value: unknown): void => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Object.isFrozen(value)
  ) {
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

export const mutativeAdapter: ImmutabilityAdapter = {
  isDraft,
  isDraftable,
  produce: (base, recipe) =>
    create(base as any, recipe as any, { enableAutoFreeze: true }),
  freezeDraftable: (value) => {
    if (isDraftable(value)) deepFreeze(value)
    return value
  },
}
