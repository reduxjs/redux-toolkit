import { createAction } from './createAction'
import { createReducer } from './createReducer'
import { createSliceSelector, createSelectorName } from './sliceSelector'

const getType = (slice, action) => (slice ? `${slice}/${action}` : action)

export function createSlice({ slice = '', reducers = {}, initialState }) {
  const actionKeys = Object.keys(reducers)

  const reducerMap = actionKeys.reduce((map, action) => {
    map[getType(slice, action)] = reducers[action]
    return map
  }, {})

  const reducer = createReducer(initialState, reducerMap, slice)

  const actionMap = actionKeys.reduce((map, action) => {
    const type = getType(slice, action)
    map[action] = createAction(type)
    return map
  }, {})

  const selectors = {
    [createSelectorName(slice)]: createSliceSelector(slice)
  }

  return {
    actions: actionMap,
    reducer,
    slice,
    selectors
  }
}
