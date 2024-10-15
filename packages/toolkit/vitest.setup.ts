import nodeFetch, { Headers, Request } from 'node-fetch'
import { server } from './src/query/tests/mocks/server'

vi.stubGlobal('fetch', nodeFetch)
vi.stubGlobal('Request', Request)
vi.stubGlobal('Headers', Headers)

/**
 * Compares two values to determine if they are instances of {@linkcode Error}
 * and have the same `name` and `message` properties.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @returns `true` if both values are instances of {@linkcode Error} and have the same `name` and `message`.
 */
const areErrorsEqual = (a: unknown, b: unknown) => {
  if (a instanceof Error && b instanceof Error) {
    return a.name === b.name && a.message === b.message
  }
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
