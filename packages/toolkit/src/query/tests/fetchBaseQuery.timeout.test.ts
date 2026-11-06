// @vitest-environment node
import { getEventListeners } from 'node:events'
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

  test.each(['global', 'request'] as const)(
    'honors a %s timeout when the request provides a signal',
    async (scope) => {
      const controller = new AbortController()
      const api = makeApi()
      const fetchFn = vi.fn<typeof fetch>(async (input) => {
        const request = input as Request
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 60)
          const abort = () => {
            clearTimeout(timer)
            reject(request.signal.reason)
          }
          if (request.signal.aborted) {
            abort()
          } else {
            request.signal.addEventListener('abort', abort, { once: true })
          }
        })
        return new Response('{}')
      })
      const baseQuery = fetchBaseQuery({
        fetchFn,
        timeout: scope === 'global' ? 20 : undefined,
      })
      const result = await baseQuery(
        {
          url: 'https://example.com',
          signal: controller.signal,
          timeout: scope === 'request' ? 20 : undefined,
        },
        api,
        {},
      )

      expect(result.error).toEqual({
        status: 'TIMEOUT_ERROR',
        error: expect.stringMatching(/^TimeoutError/),
      })
      expect(fetchFn).toHaveBeenCalledOnce()
      expect(controller.signal.aborted).toBe(false)
      expect(api.signal.aborted).toBe(false)
    },
  )

  test.each([0, 20])(
    'keeps a caller abort as FETCH_ERROR with timeout %s',
    async (timeout) => {
      const controller = new AbortController()
      controller.abort(new DOMException('Caller cancelled', 'AbortError'))
      const baseQuery = fetchBaseQuery({
        timeout,
        fetchFn: async (input) => {
          throw (input as Request).signal.reason
        },
      })
      const result = await baseQuery(
        { url: 'https://example.com', signal: controller.signal },
        makeApi(),
        {},
      )

      expect(result.error).toEqual({
        status: 'FETCH_ERROR',
        error: 'AbortError: Caller cancelled',
      })
    },
  )

  test.each([null, undefined])(
    'keeps an explicit %s signal from falling back to the API signal',
    async (signal) => {
      const api = makeApi()
      api.abort()
      const baseQuery = fetchBaseQuery({
        timeout: 20,
        fetchFn: async (input) => {
          const requestSignal = (input as Request).signal
          if (requestSignal?.aborted) throw requestSignal.reason
          return new Response('{}')
        },
      })
      const result = await baseQuery(
        { url: 'https://example.com', signal },
        api,
        {},
      )

      expect(result.data).toEqual({})
    },
  )

  test('keeps a request timeout of zero from using the global timeout', async () => {
    const baseQuery = fetchBaseQuery({
      timeout: 20,
      fetchFn: async (input) => {
        await new Promise((resolve) => setTimeout(resolve, 40))
        const signal = (input as Request).signal
        if (signal.aborted) throw signal.reason
        return new Response('{}')
      },
    })
    const result = await baseQuery(
      {
        url: 'https://example.com',
        signal: new AbortController().signal,
        timeout: 0,
      },
      makeApi(),
      {},
    )

    expect(result.data).toEqual({})
  })

  test('honors the timeout with a custom signal while reading the body', async () => {
    const controller = new AbortController()
    const baseQuery = fetchBaseQuery({ fetchFn: streamingFetch, timeout: 20 })
    const result = await baseQuery(
      { url: 'https://example.com', signal: controller.signal },
      makeApi(),
      {},
    )

    expect(result.error).toEqual({
      status: 'TIMEOUT_ERROR',
      error: expect.stringMatching(/^TimeoutError/),
    })
    expect(controller.signal.aborted).toBe(false)
  })

  test.each([
    'success',
    'fetch error',
    'parser error',
    'prepareHeaders error',
    'invalid URL',
  ] as const)('releases custom signal listeners after %s', async (outcome) => {
    const controller = new AbortController()
    const callerListener = vi.fn()
    controller.signal.addEventListener('abort', callerListener)
    const baseQuery = fetchBaseQuery({
      timeout: 1000,
      prepareHeaders: (headers) => {
        if (outcome === 'prepareHeaders error') throw new Error('headers')
        return headers
      },
      fetchFn: async () => {
        if (outcome === 'fetch error') throw new TypeError('offline')
        return new Response(outcome === 'parser error' ? '{' : '{}')
      },
    })

    for (let index = 0; index < 3; index++) {
      const request = baseQuery(
        {
          url: outcome === 'invalid URL' ? 'https://[' : 'https://example.com',
          signal: controller.signal,
        },
        makeApi(),
        {},
      )
      if (outcome === 'prepareHeaders error' || outcome === 'invalid URL') {
        await expect(request).rejects.toThrow()
      } else {
        const result = await request
        expect(result.meta?.request.signal.aborted).toBe(false)
        expect(result.error?.status).toBe(
          outcome === 'fetch error'
            ? 'FETCH_ERROR'
            : outcome === 'parser error'
              ? 'PARSING_ERROR'
              : undefined,
        )
      }
      expect(getEventListeners(controller.signal, 'abort')).toEqual([
        callerListener,
      ])
    }
    expect(controller.signal.aborted).toBe(false)
    expect(callerListener).not.toHaveBeenCalled()
  })

  test('keeps a parser TimeoutError as PARSING_ERROR when the signal did not abort', async () => {
    const baseQuery = fetchBaseQuery({
      fetchFn: async () => new Response('{}'),
      timeout: 20,
    })
    const result = await baseQuery(
      {
        url: 'https://example.com',
        signal: new AbortController().signal,
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
