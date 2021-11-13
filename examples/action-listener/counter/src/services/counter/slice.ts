import {
  createSlice,
  createEntityAdapter,
  nanoid,
  PayloadAction,
} from '@reduxjs/toolkit'

export interface Counter {
  value: number
  id: string
  intervalMs?: number
}

const counterEntity = createEntityAdapter<Counter>()

export const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    counters: counterEntity.getInitialState(),
  },
  reducers: {
    addCounter(state) {
      counterEntity.addOne(state.counters, { value: 0, id: nanoid() })
    },
    removeCounter(state, { payload }: PayloadAction<string>) {
      counterEntity.removeOne(state.counters, payload)
    },
    updateValue(state, action: PayloadAction<{ id: string; value: number }>) {
      counterEntity.upsertOne(state.counters, action)
    },
    updateBy(
      state,
      { payload: { id, delta } }: PayloadAction<{ id: string; delta: number }>
    ) {
      const previousValue = state.counters.entities[id]?.value
      if (typeof previousValue === 'number') {
        counterEntity.updateOne(state.counters, {
          id,
          changes: { value: delta + previousValue },
        })
      }
    },
    incrementByPeriodically(
      state,
      {
        payload: { id, delta, intervalMs },
      }: PayloadAction<{ id: string; delta: number; intervalMs: number }>
    ) {
      const previousValue = state.counters.entities[id]?.value
      if (
        typeof previousValue === 'number' &&
        Number.isFinite(intervalMs) &&
        intervalMs > 0
      ) {
        counterEntity.updateOne(state.counters, {
          id,
          changes: { intervalMs },
        })
      }
    },
    cancelIncrementBy(state, { payload }: PayloadAction<string>) {
      delete state.counters.entities[payload]?.intervalMs
    },
  },
})

export const counterActions = counterSlice.actions

export type CounterSlice = {
  [counterSlice.name]: ReturnType<typeof counterSlice['reducer']>
}

export const counterSelectors = counterEntity.getSelectors<CounterSlice>(
  (state) => state[counterSlice.name].counters
)
