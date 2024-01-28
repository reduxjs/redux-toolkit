import type { RetryOptions } from '@internal/query/retry'

describe('type tests', () => {
  test('RetryOptions only accepts one of maxRetries or retryCondition', () => {
    // Should complain if both `maxRetries` and `retryCondition` exist at once
    expectTypeOf<RetryOptions>().not.toMatchTypeOf({
      maxRetries: 5,
      retryCondition: () => false,
    })
  })
})

export {}
