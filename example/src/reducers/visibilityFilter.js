import { createReducer } from '@acemarke/redux-starter-kit'

function setVisibilityFilter(state, action) {
  return action.filter
}

export default createReducer('SHOW_ALL', {
  SET_VISIBILITY_FILTER: setVisibilityFilter
})
