import { Reducer } from 'redux'
import { createReducer, createAction } from '../../src'

function expectType<T>(p: T) {}

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

  const numberReducer: Reducer<number> = reducer

  // typings:expect-error
  const stringReducer: Reducer<string> = reducer
}

/**
 * Test: createReducer() state type can be specified expliclity.
 */
{
  type CounterAction =
    | { type: 'increment'; payload: number }
    | { type: 'decrement'; payload: number }

  const incrementHandler = (state: number, action: CounterAction) =>
    state + action.payload

  const decrementHandler = (state: number, action: CounterAction) =>
    state - action.payload

  createReducer<number>(0, {
    increment: incrementHandler,
    decrement: decrementHandler
  })

  // typings:expect-error
  createReducer<string>(0, {
    increment: incrementHandler,
    decrement: decrementHandler
  })
}

/*
 * Test: createReducer() ensures state type is mutable within a case reducer.
 */
{
  const initialState: { readonly counter: number } = { counter: 0 }

  createReducer(initialState, {
    increment: state => {
      state.counter += 1
    }
  })
}

/** Test:  alternative builder callback for actionMap */
{
  const increment = createAction<number, 'increment'>('increment')
  const decrement = createAction<number, 'decrement'>('decrement')

  const reducer = createReducer(0, builder => {
    builder.addCase(increment, (state, action) => {
      expectType<number>(state)
      expectType<{ type: 'increment'; payload: number }>(action)
      // typings:expect-error
      expectType<string>(state)
      // typings:expect-error
      expectType<{ type: 'increment'; payload: string }>(action)
      // typings:expect-error
      expectType<{ type: 'decrement'; payload: number }>(action)
    })

    builder.addCase('increment', (state, action) => {
      expectType<number>(state)
      expectType<{ type: 'increment' }>(action)
      // typings:expect-error
      expectType<{ type: 'decrement' }>(action)
      // typings:expect-error - this cannot be inferred and has to be manually specified
      expectType<{ type: 'increment'; payload: number }>(action)
    })

    builder.addCase(
      increment,
      (state, action: ReturnType<typeof increment>) => state
    )
    // typings:expect-error
    builder.addCase(
      increment,
      (state, action: ReturnType<typeof decrement>) => state
    )

    builder.addCase(
      'increment',
      (state, action: ReturnType<typeof increment>) => state
    )
    // typings:expect-error
    builder.addCase(
      'decrement',
      (state, action: ReturnType<typeof increment>) => state
    )
  })

  expectType<number>(reducer(0, increment(5)))
  // typings:expect-error
  expectType<string>(reducer(0, increment(5)))
}
