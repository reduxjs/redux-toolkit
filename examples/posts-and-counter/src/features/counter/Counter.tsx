import React from "react";
import styles from "./Counter.module.css";
import { counterApi } from "../../app/services/counter";

export function Counter() {
  const { data } = counterApi.hooks.getCount.useQuery();
  const [
    increment,
    incrementResult
  ] = counterApi.hooks.incrementCount.useMutation();

  const [
    decrement,
    decrementResult
  ] = counterApi.hooks.decrementCount.useMutation();

  return (
    <div>
      <div className={styles.row}>
        <button
          className={styles.button}
          aria-label="Increment value"
          onClick={() => increment(1)}
        >
          +
        </button>
        <span className={styles.value}>{data?.count || 0}</span>
        <button
          className={styles.button}
          aria-label="Decrement value"
          onClick={() => decrement(1)}
        >
          -
        </button>
      </div>
    </div>
  );
}
