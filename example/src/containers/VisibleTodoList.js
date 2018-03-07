import { connect } from 'react-redux'
import { createSelector } from '@acemarke/redux-starter-kit'
import { toggleTodo } from '../actions'
import TodoList from '../components/TodoList'

const getVisibleTodos = createSelector(['todos', 'visibilityFilter'], (todos, filter) => {
  switch (filter) {
    case 'SHOW_ALL':
      return todos
    case 'SHOW_COMPLETED':
      return todos.filter(t => t.completed)
    case 'SHOW_ACTIVE':
      return todos.filter(t => !t.completed)
    default:
      throw new Error('Unknown filter: ' + filter)
  }
})

const mapStateToProps = (state) => ({
  todos: getVisibleTodos(state)
})

const mapDispatchToProps = {
  onTodoClick: toggleTodo
}

const VisibleTodoList = connect(
  mapStateToProps,
  mapDispatchToProps
)(TodoList)

export default VisibleTodoList
