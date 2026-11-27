/** @vitest-environment node */
import { getEventListeners } from 'node:events'
import type { BaseQueryApi, BaseQueryFn } from '@reduxjs/toolkit/query'
import { retry } from '@reduxjs/toolkit/query'

afterEach(() => {
  vi.useRealTimers()
})

test.each(['success', 'exhaustion'])(
  'default backoff releases abort listeners after %s',
  async (outcome) => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const api: BaseQueryApi = {
      signal: controller.signal,
      abort: (reason) => controller.abort(reason),
      dispatch: vi.fn(),
      getState: vi.fn(),
      extra: undefined,
      endpoint: 'test',
      type: 'query',
    }
    const listenerCounts: number[] = []
    const baseQuery: BaseQueryFn = async () => {
      listenerCounts.push(getEventListeners(api.signal, 'abort').length)
      return outcome === 'success' && listenerCounts.length === 4
        ? { data: 'done' }
        : { error: 'retry me' }
    }

    const result = retry(baseQuery, { maxRetries: 3 })(undefined, api, {})
    await vi.runAllTimersAsync()

    await expect(result).resolves.toEqual(
      outcome === 'success' ? { data: 'done' } : { error: 'retry me' },
    )
    expect(listenerCounts).toEqual([0, 0, 0, 0])
    expect(getEventListeners(api.signal, 'abort')).toHaveLength(0)
  },
)
