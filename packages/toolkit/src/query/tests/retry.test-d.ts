import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@internal/query/fetchBaseQuery'
import { fetchBaseQuery } from '@internal/query/fetchBaseQuery'
import type { RetryOptions } from '@internal/query/retry'
import { retry } from '@internal/query/retry'
import type { AnyObject } from '@internal/tsHelpers.js'

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
  test('fail can be pretyped to only accept correct error and meta', () => {
    expectTypeOf(retry.fail).parameter(0).toBeUnknown()
    expectTypeOf(retry.fail).parameter(1).toEqualTypeOf<AnyObject | undefined>()
    expectTypeOf(retry.fail).toBeCallableWith('Literally anything', {})

    const myBaseQuery = fetchBaseQuery()
    const typedFail = retry.fail<typeof myBaseQuery>

    expectTypeOf(typedFail).parameter(0).toMatchTypeOf<FetchBaseQueryError>()
    expectTypeOf(typedFail)
      .parameter(1)
      .toMatchTypeOf<FetchBaseQueryMeta | undefined>()

    expectTypeOf(typedFail).toBeCallableWith(
      {
        status: 401,
        data: 'Unauthorized',
      },
      { request: new Request('http://localhost') },
    )

    expectTypeOf(typedFail).parameter(0).not.toBeString()
    expectTypeOf(typedFail).parameter(1).not.toMatchTypeOf<AnyObject>()
  })
})
