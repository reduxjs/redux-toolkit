import { createReducer } from '@acemarke/redux-starter-kit'

const visibilityFilter = createReducer('SHOW_ALL', {
  SET_VISIBILITY_FILTER(state, action) {
    return action.filter
  }
})

export default visibilityFilter
