let nextTodoId = 0
export const addTodo = (text) => ({
  type: 'ADD_TODO',
  payload: {
    id: nextTodoId++,
    text
  }
})

export const setVisibilityFilter = (payload) => ({
  type: 'SET_VISIBILITY_FILTER',
  payload
})

export const toggleTodo = (payload) => ({
  type: 'TOGGLE_TODO',
  payload
})

export const VisibilityFilters = {
  SHOW_ALL: 'SHOW_ALL',
  SHOW_COMPLETED: 'SHOW_COMPLETED',
  SHOW_ACTIVE: 'SHOW_ACTIVE'
}
