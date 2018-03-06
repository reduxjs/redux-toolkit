import { createReducer } from '@acemarke/redux-starter-kit'

const visibilityFilter = createReducer('SHOW_ALL', {
  SET_VISIBILITY_FILTER(state, payload) {
    return payload
  }
})

export default visibilityFilter
