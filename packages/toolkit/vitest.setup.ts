import nodeFetch, { Headers, Request } from 'node-fetch'
import { server } from './src/query/tests/mocks/server'

vi.stubGlobal('fetch', nodeFetch)
vi.stubGlobal('Request', Request)
vi.stubGlobal('Headers', Headers)

/**
 * Compares two values to determine if they are instances of {@linkcode Error}
 * and have the same {@linkcode Error.name | name}
 * and {@linkcode Error.message | message} properties.
 *
 * @param actualError - The actual error to compare.
 * @param expectedError - The expected error to compare against.
 * @returns `true` if both values are instances of {@linkcode Error} and have the same {@linkcode Error.name | name} and {@linkcode Error.message | message}.
 *
 * @example
 * <caption>#### __Pass: The actual error is an instance of `TypeError` with the same `message` ✔️__</caption>
 *
 * ```ts
 * expect(consoleErrorSpy).toHaveBeenLastCalledWith(
 *   TypeError('endpointDefinition.queryFn is not a function'),
 * )
 * ```
 *
 * @example
 * <caption>#### __Fail: The actual error is a `TypeError`, which is more specific than the expected generic `Error` ❌__</caption>
 *
 * ```ts
 * expect(consoleErrorSpy).toHaveBeenLastCalledWith(
 *   Error('endpointDefinition.queryFn is not a function'),
 * )
 * ```
 *
 * @internal
 */
const areErrorsEqual = (actualError: unknown, expectedError: unknown) => {
  if (actualError instanceof Error && expectedError instanceof Error) {
    return (
      actualError.name === expectedError.name &&
      actualError.message === expectedError.message
    )
  }

  return undefined
}

expect.addEqualityTesters([areErrorsEqual])

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
