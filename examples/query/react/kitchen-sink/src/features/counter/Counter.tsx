import React, { useState } from 'react';
import styles from './Counter.module.css';
import { useDecrementCountMutation, useGetCountQuery, useIncrementCountMutation } from '../../app/services/counter';

export function Counter({ id, onRemove }: { id?: string; onRemove?: () => void }) {
  const [pollingInterval, setPollingInterval] = useState(10000);
  const { data } = useGetCountQuery(undefined, { pollingInterval });
  const [increment] = useIncrementCountMutation();

  const [decrement] = useDecrementCountMutation();

  return (
    <div>
      <div className={styles.row}>
        <button className={styles.button} aria-label="Increment value" onClick={() => increment(1)}>
          +
        </button>
        <span className={styles.value}>{data?.count || 0}</span>
        <button className={styles.button} aria-label="Decrement value" onClick={() => decrement(1)}>
          -
        </button>
        <input
          type="number"
          name="pollingInterval"
          value={pollingInterval}
          onChange={({ target: { valueAsNumber } }) => setPollingInterval(valueAsNumber)}
        />
        {onRemove && <button onClick={onRemove}>Remove {id}</button>}
      </div>
    </div>
  );
}
