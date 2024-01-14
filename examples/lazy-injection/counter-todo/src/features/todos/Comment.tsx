import { useAppDispatch } from "../../app/hooks"
import { deleteComment, type Comment } from "./commentSlice"
import styles from "./Todos.module.css"

export function CommentDisplay({ comment }: { comment: Comment }) {
  const dispatch = useAppDispatch()
  return (
    <div className={styles.comment}>
      <p>{comment.message}</p>
      <button
        className={styles.button}
        onClick={() => {
          dispatch(deleteComment(comment.id))
        }}
      >
        Delete
      </button>
    </div>
  )
}
