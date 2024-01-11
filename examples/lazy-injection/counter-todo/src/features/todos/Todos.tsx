import { useAppSelector } from "../../app/hooks"
import { AddTodo } from "./AddTodo"
import { Todo } from "./Todo"
import { selectTodoIds } from "./todoSlice"
import styles from "./Todos.module.css"

export function Todos() {
  const todoIds = useAppSelector(selectTodoIds)
  return (
    <div className={styles.todos}>
      <div className={styles.todosList}>
        {todoIds.map(id => (
          <Todo key={id} id={id} />
        ))}
      </div>
      <AddTodo />
    </div>
  )
}
