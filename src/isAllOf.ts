import { hasMatchFunction, Matcher, UnionToIntersection } from './tsHelpers'
import { ActionMatchingAnyOf } from './isAnyOf'

/** @public */
export type ActionMatchingAllOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = UnionToIntersection<ActionMatchingAnyOf<Matchers>>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches all of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAllOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAllOf<Matchers> => {
    return matchers.every(matcher => {
      if (hasMatchFunction(matcher)) {
        return matcher.match(action)
      } else {
        return matcher(action)
      }
    })
  }
}
