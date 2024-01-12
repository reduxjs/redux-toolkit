import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { deleteTodo, selectTodoById } from "./todoSlice"
import styles from "./Todos.module.css"

export function Todo({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const todo = useAppSelector(state => selectTodoById(state, id))
  if (!todo) return null
  return (
    <div className={styles.todo}>
      <p>{todo.title}</p>
      <button
        className={styles.button}
        onClick={() => dispatch(deleteTodo(id))}
      >
        Delete
      </button>
    </div>
  )
}
