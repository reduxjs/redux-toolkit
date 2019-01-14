import { AnyAction, createReducer, Reducer } from 'redux-starter-kit'

/*
 * Test: createReducer() infers type of returned reducer.
 */
{
  type CounterAction =
    | { type: 'increment'; payload: number }
    | { type: 'decrement'; payload: number }

  const incrementHandler = (state: number, action: CounterAction) => state + 1
  const decrementHandler = (state: number, action: CounterAction) => state - 1

  const reducer = createReducer(0 as number, {
    increment: incrementHandler,
    decrement: decrementHandler
  })

  const numberReducer: Reducer<number, CounterAction> = reducer

  // typings:expect-error
  const stringReducer: Reducer<string, CounterAction> = reducer

  // typings:expect-error
  const anyActionReducer: Reducer<number, AnyAction> = reducer
}

/**
 * Test: createReducer() type parameters can be specified expliclity.
 */
{
  type CounterAction =
    | { type: 'increment'; payload: number }
    | { type: 'decrement'; payload: number }

  const incrementHandler = (state: number, action: CounterAction) =>
    state + action.payload

  const decrementHandler = (state: number, action: CounterAction) =>
    state - action.payload

  createReducer<number, CounterAction>(0, {
    increment: incrementHandler,
    decrement: decrementHandler
  })

  // typings:expect-error
  createReducer<string, CounterAction>(0, {
    increment: incrementHandler,
    decrement: decrementHandler
  })

  // typings:expect-error
  createReducer<number, AnyAction>(0, {
    increment: incrementHandler,
    decrement: decrementHandler
  })
}

/*
 * Test: createReducer() reducers are typed to return readonly states.
 */
{
  const initialCounters = {
    a: 0,
    b: 0
  }

  const reducer = createReducer(initialCounters, {
    incrementA: state => {
      state.a += 1
    },
    incrementB: state => {
      state.b += 1
    }
  })

  const newCounters = reducer(initialCounters, { type: 'incrementA' })

  // typings:expect-error
  newCounters.a++
}
