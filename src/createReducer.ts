import createNextState from 'immer'

export type ImpureReducer<S> = (state: S, action: any) => S | void

export function createReducer<S>(
  initialState: S,
  actionsMap: Record<string, ImpureReducer<S>>
) {
  return function(state = initialState, action: any) {
    return createNextState(state, draft => {
      const caseReducer = actionsMap[action.type]

      if (caseReducer) {
        return caseReducer(draft, action)
      }

      return draft
    })
  }
}
