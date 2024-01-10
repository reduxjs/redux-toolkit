import type { AppStore } from "../../app/store"
import { makeStore } from "../../app/store"
import type { CounterSliceState } from "./counterSlice"
import {
  counterSlice,
  decrement,
  increment,
  incrementByAmount,
  selectCount,
} from "./counterSlice"

interface LocalTestContext {
  store: AppStore
}

describe<LocalTestContext>("counter reducer", it => {
  beforeEach<LocalTestContext>(context => {
    const initialState: CounterSliceState = {
      value: 3,
      status: "idle",
    }

    const store = makeStore({ counter: initialState })

    context.store = store
  })

  it("should handle initial state", () => {
    expect(counterSlice.reducer(undefined, { type: "unknown" })).toStrictEqual({
      value: 0,
      status: "idle",
    })
  })

  it("should handle increment", ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(increment())

    expect(selectCount(store.getState())).toBe(4)
  })

  it("should handle decrement", ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(decrement())

    expect(selectCount(store.getState())).toBe(2)
  })

  it("should handle incrementByAmount", ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(incrementByAmount(2))

    expect(selectCount(store.getState())).toBe(5)
  })
})
