import { createReducer } from '@acemarke/redux-starter-kit'

const todos = createReducer([], {
  ADD_TODO(state, action) {
    state.push({
      id: action.id,
      text: action.text,
      completed: false
    })
  },
  TOGGLE_TODO(state, action) {
    const todo = state.find(todo => todo.id === action.id)
    todo.completed = !todo.completed
  }
})

export default todos
