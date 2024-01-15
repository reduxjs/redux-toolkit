import { useAppSelector } from "../../app/hooks"
import { AddTodo } from "./AddTodo"
import { selectTodoIds } from "./todoSlice"
import styles from "./Todos.module.css"
import { lazily } from "react-lazily"
import { Suspense } from "react"

const { Todo } = lazily(() => import("./Todo"))

export function Todos() {
  const todoIds = useAppSelector(selectTodoIds)
  return (
    <div className={styles.todos}>
      <AddTodo />
      <Suspense fallback="Loading todos">
        <div className={styles.todosList}>
          {todoIds.map(id => (
            <Todo key={id} id={id} />
          ))}
        </div>
      </Suspense>
    </div>
  )
}
