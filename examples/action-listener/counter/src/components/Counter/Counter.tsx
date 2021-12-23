import { EntityId } from '@reduxjs/toolkit'
import { memo } from 'react'
import { counterActions, counterSelectors } from '../../services/counter/slice'
import { useAppDispatch, useAppSelector } from '../../store'
import styles from './counter.module.css'
import clsx from 'clsx'

export interface CounterProps {
  counterId: EntityId
}

const intervalMs = 1_000
const delayMs = 2_000

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
  const updateAsync = () =>
    appDispatch(counterActions.updateByAsync({ id, delayMs, delta: 1 }))
  const intervalUpdate = () => {
    if (counter.intervalMs) {
      appDispatch(counterActions.cancelAsyncUpdates(id))
    } else {
      appDispatch(
        counterActions.updateByPeriodically({ id, delta: 1, intervalMs })
      )
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
          {counter.intervalMs
            ? `stop periodic update`
            : `+1 every ${intervalMs / 1_000}s`}
        </button>
        <button className="btn-small" onClick={updateAsync}>
          +1 after {`${delayMs / 1000}s`}
        </button>
      </div>
    </section>
  )
})
