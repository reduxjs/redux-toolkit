import type { RetryOptions } from '@internal/query/retry'

describe('type tests', () => {
  test('RetryOptions only accepts one of maxRetries or retryCondition', () => {
    // Should not complain if only `maxRetries` exists
    expectTypeOf({ maxRetries: 5 }).toMatchTypeOf<RetryOptions>()

    // Should not complain if only `retryCondition` exists
    expectTypeOf({ retryCondition: () => false }).toMatchTypeOf<RetryOptions>()

    // Should complain if both `maxRetries` and `retryCondition` exist at once
    expectTypeOf({
      maxRetries: 5,
      retryCondition: () => false,
    }).not.toMatchTypeOf<RetryOptions>()
  })
})

export {}
