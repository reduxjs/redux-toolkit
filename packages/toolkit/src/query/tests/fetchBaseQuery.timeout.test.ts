// @vitest-environment node
import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import { fetchBaseQuery } from '@reduxjs/toolkit/query'

const makeApi = (): BaseQueryApi => {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    abort: (reason) => controller.abort(reason),
    dispatch: vi.fn(),
    getState: () => ({}),
    extra: undefined,
    endpoint: 'test',
    type: 'query',
  }
}

const streamingFetch: typeof fetch = async (input) => {
  const request = input as Request
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"value":'))
        request.signal.addEventListener(
          'abort',
          () =>
            controller.error(new DOMException('Body aborted', 'AbortError')),
          { once: true },
        )
      },
    }),
    { headers: { 'content-type': 'application/json' } },
  )
}

describe('fetchBaseQuery response body timeouts', () => {
  test.each(['json', 'text', 'content-type'] as const)(
    'returns TIMEOUT_ERROR while reading a %s response body',
    async (responseHandler) => {
      const baseQuery = fetchBaseQuery({ fetchFn: streamingFetch })
      const result = await baseQuery(
        { url: 'https://example.com', timeout: 20, responseHandler },
        makeApi(),
        {},
      )

      expect(result.error).toEqual({
        status: 'TIMEOUT_ERROR',
        error: expect.stringMatching(/^TimeoutError/),
      })
      expect(result.meta?.response?.status).toBe(200)
    },
  )

  test('honors a global timeout while reading the body', async () => {
    const baseQuery = fetchBaseQuery({ fetchFn: streamingFetch, timeout: 20 })
    const result = await baseQuery('https://example.com', makeApi(), {})

    expect(result.error).toEqual({
      status: 'TIMEOUT_ERROR',
      error: expect.stringMatching(/^TimeoutError/),
    })
  })

  test('keeps a parser TimeoutError as PARSING_ERROR when the signal did not abort', async () => {
    const baseQuery = fetchBaseQuery({
      fetchFn: async () => new Response('{}'),
    })
    const result = await baseQuery(
      {
        url: 'https://example.com',
        responseHandler: async () => {
          throw new DOMException('Parser failed', 'TimeoutError')
        },
      },
      makeApi(),
      {},
    )

    expect(result.error).toEqual({
      status: 'PARSING_ERROR',
      originalStatus: 200,
      data: '{}',
      error: 'TimeoutError: Parser failed',
    })
  })
})
