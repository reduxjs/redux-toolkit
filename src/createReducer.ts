import createNextState from 'immer'
import { Reducer, ReducersMapObject } from 'redux'

export function createReducer<S>(
  initialState: S,
  actionsMap: ReducersMapObject
): Reducer<S> {
  return function(state = initialState, action) {
    return createNextState(state, draft => {
      const caseReducer = actionsMap[action.type]

      if (caseReducer) {
        return caseReducer(draft, action)
      }

      return draft
    })
  }
}
