import type {
  Quote,
  QuotesApiResponse,
} from '../features/quotes/quotesApiSlice'
import { QUOTES_BASE_URL } from '../features/quotes/quotesApiSlice'

/**
 * Replaces `fetch` for the duration of a test run.
 *
 * The quotes API points at a live third-party service. Leaving that unmocked
 * makes the test suite fail whenever that service is slow or down, which has
 * nothing to do with whether RTK resolved and loaded correctly. It also breaks
 * under Expo, whose `fetch` returns a Response backed by a native module that
 * is absent in Jest, so `response.clone()` throws inside `fetchBaseQuery`.
 */

const makeQuote = (id: number): Quote => ({
  id,
  quote: `Sample quote ${id.toString()}`,
  author: `Author ${id.toString()}`,
})

const readLimit = (url: string) => {
  const search = url.split('?')[1] ?? ''
  const match = /(?:^|&)limit=(\d+)/.exec(search)
  return match ? Number(match[1]) : 10
}

export const installQuotesFetchMock = () => {
  const mockFetch = jest.fn((input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (!url.startsWith(QUOTES_BASE_URL)) {
      return Promise.reject(new Error(`Unmocked request in tests: ${url}`))
    }

    const limit = readLimit(url)
    const body: QuotesApiResponse = {
      quotes: Array.from({ length: limit }, (_, index) => makeQuote(index + 1)),
      total: 100,
      skip: 0,
      limit,
    }

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
  })

  global.fetch = mockFetch as unknown as typeof fetch

  return mockFetch
}
