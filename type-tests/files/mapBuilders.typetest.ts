import { executeReducerBuilderCallback } from 'src/mapBuilders'
import { createAction, AnyAction } from 'src'

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

    // action type is inferred
    builder.addMatcher(increment.match, (state, action) => {
      expectType<ReturnType<typeof increment>>(action)
    })

    // addCase().addMatcher() is possible, action type inferred correctly
    builder
      .addCase(
        'increment',
        (state, action: ReturnType<typeof increment>) => state
      )
      .addMatcher(decrement.match, (state, action) => {
        expectType<ReturnType<typeof decrement>>(action)
      })

    // addCase().addDefaultCase() is possible, action type is AnyAction
    builder
      .addCase(
        'increment',
        (state, action: ReturnType<typeof increment>) => state
      )
      .addDefaultCase((state, action) => {
        expectType<AnyAction>(action)
      })

    {
      // addMatcher() should prevent further calls to addCase()
      const b = builder.addMatcher(increment.match, () => {})
      // typings:expect-error
      b.addCase(increment, () => {})
      b.addMatcher(increment.match, () => {})
      b.addDefaultCase(() => {})
    }

    {
      // addDefaultCase() should prevent further calls to addCase(), addMatcher() and addDefaultCase
      const b = builder.addDefaultCase(() => {})
      // typings:expect-error
      b.addCase(increment, () => {})
      // typings:expect-error
      b.addMatcher(increment.match, () => {})
      // typings:expect-error
      b.addDefaultCase(() => {})
    }
  })
}
