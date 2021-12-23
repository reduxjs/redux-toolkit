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
    addCounter(
      state,
      { payload: { initialValue } }: PayloadAction<{ initialValue: number }>
    ) {
      counterEntity.addOne(state.counters, {
        value: initialValue,
        id: nanoid(),
      })
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
    updateByPeriodically(
      state,
      {
        payload: { id, intervalMs },
      }: PayloadAction<{ id: string; delta: number; intervalMs: number }>
    ) {
      const previousValue = state.counters.entities[id]?.value
      const previousIntervalMs = state.counters.entities[id]?.intervalMs
      if (
        typeof previousValue === 'number' &&
        Number.isFinite(intervalMs) &&
        intervalMs > 0 &&
        !previousIntervalMs
      ) {
        counterEntity.updateOne(state.counters, {
          id,
          changes: { intervalMs },
        })
      }
    },
    updateByAsync(
      _,
      action: PayloadAction<{ id: string; delta: number; delayMs: number }>
    ) {},
    cancelAsyncUpdates(state, { payload }: PayloadAction<string>) {
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
