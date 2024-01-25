import { makeStore } from "../../app/store"
import type { CounterSliceState } from "./counterSlice"
import {
  counterSlice,
  decrement,
  increment,
  incrementByAmount,
  selectCount,
} from "./counterSlice"

describe("counter reducer", () => {
  const initialState: CounterSliceState = {
    value: 3,
    status: "idle",
  }

  let store = makeStore()

  beforeEach(() => {
    store = makeStore({ counter: initialState })
  })

  it("should handle initial state", () => {
    expect(counterSlice.reducer(undefined, { type: "unknown" })).toStrictEqual({
      value: 0,
      status: "idle",
    })
  })

  it("should handle increment", () => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(increment())

    expect(selectCount(store.getState())).toBe(4)
  })

  it("should handle decrement", () => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(decrement())

    expect(selectCount(store.getState())).toBe(2)
  })

  it("should handle incrementByAmount", () => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(incrementByAmount(2))

    expect(selectCount(store.getState())).toBe(5)
  })
})
