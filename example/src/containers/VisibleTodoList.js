import { connect } from 'react-redux'
import { createSelector } from '@acemarke/redux-starter-kit'
import { toggleTodo } from '../actions'
import TodoList from '../components/TodoList'

const getVisibleTodos = createSelector(
  ['visibilityFilter', 'todos'],
  (visibilityFilter, todos) => {
    switch (visibilityFilter) {
      case 'SHOW_COMPLETED':
        return todos.filter(t => t.completed)
      case 'SHOW_ACTIVE':
        return todos.filter(t => !t.completed)
      default:
        return todos
    }
  }
)

const mapStateToProps = createSelector({ todos: getVisibleTodos })

const mapDispatchToProps = {
  onTodoClick: toggleTodo
}

const VisibleTodoList = connect(mapStateToProps, mapDispatchToProps)(TodoList)

export default VisibleTodoList
