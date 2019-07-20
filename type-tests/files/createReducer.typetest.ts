import {
  AnyAction,
  createReducer,
  Reducer,
  PayloadAction
} from 'redux-starter-kit'

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

/*
 * Test: createReducer accepts EnhancedReducer
 */
{
  // TODO: is this possible to type? currently unfortunately failing
  // prepared payload does not match action payload - should cause an error

  // typings:expect-error
  createReducer(
    { counter: 0 },
    {
      increment: {
        reducer(state, action) {
          state.counter += action.payload.length
        },
        prepare() {
          return {
            payload: 6
          }
        }
      }
    }
  )
}
