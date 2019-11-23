import { executeReducerBuilderCallback } from 'src/mapBuilders'
import { createAction, CaseReducers } from 'src'

function expectType<T>(t: T) {
  return t
}

/** Test:  alternative builder callback for actionMap */
{
  const increment = createAction<number, 'increment'>('increment')
  const decrement = createAction<number, 'decrement'>('decrement')

  executeReducerBuilderCallback<number>(builder => {
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
}
