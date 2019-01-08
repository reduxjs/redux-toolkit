import createNextState from 'immer'
import { AnyAction, Action, Reducer } from 'redux'

/**
 * An *case reducer* is a reducer function for a speficic action type. Case
 * reducers can be composed to full reducers using `createReducer()`.
 *
 * Unlike a normal Redux reducer, a case reducer is never called with an
 * `undefined` state to determine the initial state. Instead, the initial
 * state is explicitly specified as an argument to `createReducer()`.
 *
 * In addition, a case reducer can choose to mutate the passed-in `state`
 * value directly instead of returning a new state. This does not actually
 * cause the store state to be mutated directly; instead, thanks to
 * [immer](https://github.com/mweststrate/immer), the mutations are
 * translated to copy operations that result in a new state.
 */
export type CaseReducer<S = any, A extends Action = AnyAction> = (
  state: S,
  action: A
) => S | void

/**
 * A mapping from action types to case reducers for `createReducer()`.
 */
export interface CaseReducersMapObject<S = any, A extends Action = AnyAction> {
  [actionType: string]: CaseReducer<S, A>
}

/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @param initialState The initial state to be returned by the reducer.
 * @param actionsMap A mapping from action types to action-type-specific
 *   case redeucers.
 */
export function createReducer<S = any, A extends Action = AnyAction>(
  initialState: S,
  actionsMap: CaseReducersMapObject<S, A>
): Reducer<S, A> {
  return function(state = initialState, action): S {
    return createNextState(state, draft => {
      const caseReducer = actionsMap[action.type]
      return caseReducer ? caseReducer(draft as S, action) : draft
    }) as S
  }
}
