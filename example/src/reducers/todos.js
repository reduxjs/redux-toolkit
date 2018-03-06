import { createReducer } from '@acemarke/redux-starter-kit'

const todos = createReducer([], {
  ADD_TODO(state, payload) {
    state.push({
      ...payload,
      completed: false
    })
  },
  TOGGLE_TODO(state, payload) {
    const todo = state.find(todo => todo.id === payload)
    todo.completed = !todo.completed
  }
})

export default todos
