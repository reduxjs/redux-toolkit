import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { deleteTodo, selectTodoById } from "./todoSlice"
import styles from "./Todos.module.css"
import { AddComment } from "./AddComment"
import { selectCommentsByTodoId } from "./commentSlice"
import { CommentDisplay } from "./Comment"

export function Todo({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const todo = useAppSelector(state => selectTodoById(state, id))
  const comments = useAppSelector(state => selectCommentsByTodoId(state, id))
  if (!todo) return null
  return (
    <div className={styles.todo}>
      <div className={styles.todoHeader}>
        <p>{todo.title}</p>
        <button
          className={styles.button}
          onClick={() => dispatch(deleteTodo(id))}
        >
          Delete
        </button>
      </div>
      <hr />
      {comments.map(comment => (
        <CommentDisplay key={comment.id} comment={comment} />
      ))}
      <AddComment todoId={id} />
    </div>
  )
}
