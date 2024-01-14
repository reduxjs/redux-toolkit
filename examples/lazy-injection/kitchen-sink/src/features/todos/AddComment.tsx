import { useState } from "react"
import styles from "./Todos.module.css"
import { useAppDispatch } from "../../app/hooks"
import { addComment } from "./commentSlice"

export function AddComment({ todoId }: { todoId: string }) {
  const dispatch = useAppDispatch()
  const [message, setMessage] = useState("")
  return (
    <div className={styles.addTodo}>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button
        className={styles.button}
        disabled={!message.length}
        onClick={() => {
          dispatch(addComment({ todoId, message }))
          setMessage("")
        }}
      >
        Add comment
      </button>
    </div>
  )
}
