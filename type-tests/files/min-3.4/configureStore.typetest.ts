import { Dispatch, Middleware } from 'redux'
import { configureStore, getDefaultMiddleware } from 'src'
import { ThunkAction } from 'redux-thunk'

/**
 * Test: Dispatch typings
 */
{
  type StateA = number
  const reducerA = () => 0
  function thunkA() {
    return ((() => {}) as any) as ThunkAction<Promise<'A'>, StateA, any, any>
  }

  type StateB = string
  function thunkB() {
    return (dispatch: Dispatch, getState: () => StateB) => {}
  }

  /**
   * Test: custom middleware and getDefaultMiddleware
   */
  {
    const store = configureStore({
      reducer: reducerA,
      middleware: [
        ((() => {}) as any) as Middleware<(a: 'a') => 'A', StateA>,
        ...getDefaultMiddleware<StateA>()
      ] as const
    })
    const result1: 'A' = store.dispatch('a')
    const result2: Promise<'A'> = store.dispatch(thunkA())
    // typings:expect-error
    store.dispatch(thunkB())
  }
}
