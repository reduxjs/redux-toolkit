import { ActionFromMatcher, hasMatchFunction, Matcher } from './tsHelpers'

/** @public */
export type ActionMatchingAnyOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = ActionFromMatcher<Matchers[number]>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches any one of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAnyOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAnyOf<Matchers> => {
    return matchers.some(matcher => {
      if (hasMatchFunction(matcher)) {
        return matcher.match(action)
      } else {
        return matcher(action)
      }
    })
  }
}
