import createNextState from 'immer'
import { Action, AnyAction } from 'redux'

export type ImpureReducer<S, A> = (state: S, action: A) => S | void

export function createReducer<S, A extends AnyAction>(
  initialState: S,
  actionsMap: { [K in A['type']]: ImpureReducer<S, Extract<A, Action<K>>> }
) {
  return function(state = initialState, action: A) {
    return createNextState(state, draft => {
      const caseReducer: ImpureReducer<S, A['type']> = actionsMap[action.type]

      if (caseReducer) {
        return caseReducer(draft, action)
      }

      return draft
    })
  }
}
