import createNextState from 'immer'

export function createReducer(initialState, actionsMap, slice = '') {
  const reducer = function(state = initialState, action) {
    return createNextState(state, draft => {
      const caseReducer = actionsMap[action.type]

      if (caseReducer) {
        return caseReducer(draft, action)
      }

      return draft
    })
  }
  if (typeof slice !== 'string') {
    slice = ''
  }
  reducer.toString = () => slice
  return reducer
}
