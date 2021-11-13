import { EntityId } from '@reduxjs/toolkit'
import { memo } from 'react'
import { counterActions, counterSelectors } from '../../services/counter/slice'
import { useAppDispatch, useAppSelector } from '../../store'
import styles from './counter.module.css'
import clsx from 'clsx'

export interface CounterProps {
  counterId: EntityId
}

const intervalMs = 1_000;

export const Counter = memo(function Counter({ counterId }: CounterProps) {
  const counter = useAppSelector((state) =>
    counterSelectors.selectById(state, counterId)
  )
  const appDispatch = useAppDispatch()

  if (!counter) {
    return null
  }

  const { id, value } = counter

  const add = () => appDispatch(counterActions.updateBy({ id, delta: +1 }))
  const subtract = () => appDispatch(counterActions.updateBy({ id, delta: -1 }))
  const close = () => appDispatch(counterActions.removeCounter(id))

  const intervalUpdate = () => {
    if(counter.intervalMs) {
      appDispatch(counterActions.cancelIncrementBy(id));
    } else {
      appDispatch(counterActions.incrementByPeriodically({ id, delta: 1, intervalMs }));
    }
  }

  return (
    <section className={clsx('paper', styles.wrapper)}>
      <button
        type="button"
        className={styles.closeBtn}
        aria-label="close"
        title="close"
        onClick={close}
      >
        &times;
      </button>
      <h4>ID: {id}</h4>
      <strong className={clsx(styles.counterValue, 'badge')}>{value}</strong>
      <div className={styles.btnGroup}>
        <button className="btn-small" type="button" onClick={add}>
          +
        </button>
        <button className="btn-small" type="button" onClick={subtract}>
          -
        </button>
        <button className="btn-small" type="button" onClick={intervalUpdate}>
          {counter.intervalMs ? `stop periodic update` : `update every ${(intervalMs / 1_000)}s`}
        </button>
      </div>
    </section>
  )
})
