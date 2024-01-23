describe('RetryOptions type tests', () => {
  test('RetryOptions only accepts one of maxRetries or retryCondition', () => {
    // @ts-expect-error Should complain if both exist at once
    const ro: RetryOptions = {
      maxRetries: 5,
      retryCondition: () => false,
    }
  })
})

export {}
