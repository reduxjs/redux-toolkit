import { useAppSelector } from '../../store'
import { counterSelectors } from '../../services/counter/slice'
import { Counter } from '../Counter/Counter'
import styles from './counter.module.css'

export function CounterList() {
  const counterIds = useAppSelector((state) =>
    counterSelectors.selectIds(state)
  )

  return (
    <article className={styles.wrapper}>
      <h3>Counters</h3>
      {counterIds.map((counterId) => (
        <Counter key={counterId} counterId={counterId} />
      ))}
    </article>
  )
}
