import { current, isDraft } from 'immer'
import { createSelector } from 'reselect'

export const createDraftSafeSelector: typeof createSelector = (
  ...args: unknown[]
) => {
  const selector = (createSelector as any)(...args)
  const wrappedSelector = (value: unknown, ...rest: unknown[]) =>
    selector(isDraft(value) ? current(value) : value, ...rest)
  return wrappedSelector as any
}
