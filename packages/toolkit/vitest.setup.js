//@ts-ignore
import nodeFetch from 'node-fetch'
//@ts-ignore
globalThis.fetch = nodeFetch
//@ts-ignore
globalThis.Request = nodeFetch.Request
globalThis.Headers = nodeFetch.Headers
import { server } from './src/query/tests/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

process.on('unhandledRejection', (error) => {
  // eslint-disable-next-line no-undef
  fail(error)
})

process.env.NODE_ENV = 'development'
