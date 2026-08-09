import { useAppDispatch, useAppSelector } from '../../app-core/hooks'
import {
  increment,
  incrementAsync,
  selectCount,
  selectStatus,
} from './counterSlice'
import styles from './Counter.module.css'

export function Counter() {
  const count = useAppSelector(selectCount)
  const status = useAppSelector(selectStatus)
  const dispatch = useAppDispatch()

  return (
    <div>
      <h2>Counter</h2>
      <div className={styles.row}>
        <span className={styles.value} data-testid="counter-value">
          {count}
        </span>
        <button
          className={styles.button}
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
        >
          +
        </button>
        <button
          className={styles.button}
          aria-label="Increment async"
          onClick={() => dispatch(incrementAsync(2))}
        >
          + Async
        </button>
      </div>
      <div data-testid="counter-status">{status}</div>
    </div>
  )
}
