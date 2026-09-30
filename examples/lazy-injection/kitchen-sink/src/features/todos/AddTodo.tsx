import { useState } from "react"
import styles from "./Todos.module.css"
import { useAppDispatch } from "../../app/hooks"
import { addTodo } from "./todoSlice"

export function AddTodo() {
  const dispatch = useAppDispatch()
  const [title, setTitle] = useState("")
  return (
    <div className={styles.addTodo}>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <button
        className={styles.button}
        disabled={!title.length}
        onClick={() => {
          dispatch(addTodo({ title }))
          setTitle("")
        }}
      >
        Add todo
      </button>
    </div>
  )
}
