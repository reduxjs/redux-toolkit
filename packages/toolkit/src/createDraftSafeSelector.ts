import { current, isDraft } from 'immer'
import { createSelector } from 'reselect'
import type { ImmutableHelpers } from './tsHelpers'

export type BuildCreateDraftSafeSelectorConfiguration = Pick<
  ImmutableHelpers,
  'isDraft' | 'current'
>

/**
 * "Draft-Safe" version of `reselect`'s `createSelector`:
 * If an `immer`-drafted object is passed into the resulting selector's first argument,
 * the selector will act on the current draft value, instead of returning a cached value
 * that might be possibly outdated if the draft has been modified since.
 * @public
 */
export type CreateDraftSafeSelector = typeof createSelector

export function buildCreateDraftSafeSelector({
  isDraft,
  current,
}: BuildCreateDraftSafeSelectorConfiguration): CreateDraftSafeSelector {
  return function createDraftSafeSelector(...args: unknown[]) {
    const selector = (createSelector as any)(...args)
    const wrappedSelector = (value: unknown, ...rest: unknown[]) =>
      selector(isDraft(value) ? current(value) : value, ...rest)
    return wrappedSelector as any
  }
}

export const createDraftSafeSelector = buildCreateDraftSafeSelector({
  isDraft,
  current,
})
