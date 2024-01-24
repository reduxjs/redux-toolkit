import nodeFetch, { Headers, Request } from 'node-fetch'
import { server } from './src/query/tests/mocks/server'

vi.stubGlobal('fetch', nodeFetch)
vi.stubGlobal('Request', Request)
vi.stubGlobal('Headers', Headers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
