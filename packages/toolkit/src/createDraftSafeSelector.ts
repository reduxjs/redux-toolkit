import { createSelectorCreator, defaultMemoize } from 'reselect'
import type { ImmutableHelpers } from './tsHelpers'
import { immutableHelpers } from './immer'

export type BuildCreateDraftSafeSelectorConfiguration = Pick<
  ImmutableHelpers,
  'isDraft' | 'current'
>

export function buildCreateDraftSafeSelectorCreator({
  isDraft,
  current,
}: BuildCreateDraftSafeSelectorConfiguration): typeof createSelectorCreator {
  return function createDraftSafeSelectorCreator(...args: unknown[]) {
    const createSelector = (createSelectorCreator as any)(...args)
    return function createDraftSafeSelector(...args: unknown[]) {
      const selector = (createSelector as any)(...args)
      const wrappedSelector = (value: unknown, ...rest: unknown[]) =>
        selector(isDraft(value) ? current(value) : value, ...rest)
      return wrappedSelector as any
    }
  }
}

export const createDraftSafeSelectorCreator =
  buildCreateDraftSafeSelectorCreator(immutableHelpers)

/**
 * "Draft-Safe" version of `reselect`'s `createSelector`:
 * If an `immer`-drafted object is passed into the resulting selector's first argument,
 * the selector will act on the current draft value, instead of returning a cached value
 * that might be possibly outdated if the draft has been modified since.
 * @public
 */
export const createDraftSafeSelector =
  createDraftSafeSelectorCreator(defaultMemoize)
