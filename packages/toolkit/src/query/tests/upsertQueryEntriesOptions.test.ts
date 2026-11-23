import type { UpsertEntriesOptions } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery, QueryStatus } from '@reduxjs/toolkit/query'
import { setupApiStore } from '../../tests/utils/helpers'

interface Post {
  id: number
  title: string
}

type Deferred = {
  resolve: (post: Post) => void
  reject: (message: string) => void
}

let requests: Deferred[] = []

const api = createApi({
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: ['Post'],
  keepUnusedDataFor: 60,
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      queryFn: () =>
        new Promise((resolve) => {
          requests.push({
            resolve: (post) => resolve({ data: post }),
            reject: (error) => resolve({ error }),
          })
        }),
      providesTags: (result) =>
        result ? [{ type: 'Post', id: result.title }] : [],
    }),
  }),
})

const storeRef = setupApiStore(api)

const fetched: Post = { id: 1, title: 'fetched' }
const upserted: Post = { id: 1, title: 'upserted' }

const selectPost = () =>
  api.endpoints.getPost.select(1)(storeRef.store.getState())

const providedTitles = () =>
  Object.keys(storeRef.store.getState().api.provided.tags.Post ?? {}).filter(
    (title) =>
      storeRef.store.getState().api.provided.tags.Post[title].length > 0,
  )

const upsert = (options?: UpsertEntriesOptions) =>
  storeRef.store.dispatch(
    api.util.upsertQueryEntries(
      [{ endpointName: 'getPost', arg: 1, value: upserted }],
      options,
    ),
  )

const startFetch = () => {
  const promise = storeRef.store.dispatch(
    api.endpoints.getPost.initiate(1, { subscribe: false, forceRefetch: true }),
  )
  return { promise, request: requests[requests.length - 1] }
}

const fetchInitialData = async () => {
  const { promise, request } = startFetch()
  request.resolve({ id: 1, title: 'initial' })
  await promise
}

beforeEach(() => {
  requests = []
})

describe('upsertQueryEntries options', () => {
  test('without options, an in-flight request overwrites the upsert', async () => {
    const { promise, request } = startFetch()
    upsert()
    expect(selectPost().data).toEqual(upserted)

    request.resolve(fetched)
    await promise
    expect(selectPost().data).toEqual(fetched)
  })

  test('without options, the action meta has no options', () => {
    const action = api.util.upsertQueryEntries([
      { endpointName: 'getPost', arg: 1, value: upserted },
    ])
    expect(action).toHaveProperty('meta')
    expect(action).not.toHaveProperty(['meta', 'options'])
  })

  describe('ignoreEarlierFetches', () => {
    test('discards the data of a request started before the write', async () => {
      const { promise, request } = startFetch()
      upsert({ ignoreEarlierFetches: true })

      request.resolve(fetched)
      const result = await promise

      // The query promise resolves with the cache entry
      expect(result.data).toEqual(upserted)
      expect(selectPost()).toMatchObject({
        status: QueryStatus.fulfilled,
        data: upserted,
        isSuccess: true,
      })
      expect(selectPost()).not.toHaveProperty('discardDataOfRequestId')
      expect(providedTitles()).toEqual(['upserted'])
    })

    test('keeps the data of a request started after the write', async () => {
      await fetchInitialData()
      upsert({ ignoreEarlierFetches: true })

      const { promise, request } = startFetch()
      request.resolve(fetched)
      await promise
      expect(selectPost().data).toEqual(fetched)
      expect(providedTitles()).toEqual(['fetched'])
    })

    test('a rejected earlier request sets the error and keeps the written data', async () => {
      const { promise, request } = startFetch()
      upsert({ ignoreEarlierFetches: true })

      request.reject('failed')
      await promise
      expect(selectPost()).toMatchObject({
        status: QueryStatus.rejected,
        error: 'failed',
        data: upserted,
      })
      expect(selectPost()).not.toHaveProperty('discardDataOfRequestId')
    })

    test('discards an earlier request after a default upsert set the status to fulfilled', async () => {
      const { promise, request } = startFetch()
      upsert()
      expect(selectPost().status).toBe(QueryStatus.fulfilled)
      upsert({ ignoreEarlierFetches: true })

      request.resolve(fetched)
      await promise
      expect(selectPost().data).toEqual(upserted)
      expect(providedTitles()).toEqual(['upserted'])
    })

    test('discards an upsertQueryData call started before the write', async () => {
      const promise = storeRef.store.dispatch(
        api.util.upsertQueryData('getPost', 1, fetched),
      )
      upsert({ ignoreEarlierFetches: true })

      await promise
      expect(selectPost()).toMatchObject({
        status: QueryStatus.fulfilled,
        data: upserted,
      })
      expect(selectPost()).not.toHaveProperty('discardDataOfRequestId')
      expect(providedTitles()).toEqual(['upserted'])
    })
  })

  describe('keepRequestState', () => {
    test('keeps a pending request state and writes the data', async () => {
      const { promise, request } = startFetch()
      const before = selectPost()
      upsert({ keepRequestState: true })

      const after = selectPost()
      expect(after).toMatchObject({
        status: QueryStatus.pending,
        requestId: before.requestId,
        startedTimeStamp: before.startedTimeStamp,
        data: upserted,
      })
      expect(after.isLoading).toBe(true)

      request.resolve(fetched)
      await promise
      expect(selectPost()).toMatchObject({
        status: QueryStatus.fulfilled,
        data: fetched,
      })
    })

    test('keeps a rejected request state', async () => {
      const { promise, request } = startFetch()
      request.reject('failed')
      await promise
      const before = selectPost()

      upsert({ keepRequestState: true })
      expect(selectPost()).toMatchObject({
        status: QueryStatus.rejected,
        error: 'failed',
        requestId: before.requestId,
        data: upserted,
      })
    })

    test('keeps the timestamps of a fulfilled request', async () => {
      vi.useFakeTimers()
      try {
        await fetchInitialData()
        const before = selectPost()
        await vi.advanceTimersByTimeAsync(1_000)

        upsert({ keepRequestState: true })
        expect(selectPost()).toMatchObject({
          status: QueryStatus.fulfilled,
          requestId: before.requestId,
          startedTimeStamp: before.startedTimeStamp,
          fulfilledTimeStamp: before.fulfilledTimeStamp,
          data: upserted,
        })
        expect(providedTitles()).toEqual(['upserted'])
      } finally {
        vi.useRealTimers()
      }
    })

    test('creates a missing entry as fulfilled', () => {
      upsert({ keepRequestState: true })
      expect(selectPost()).toMatchObject({
        status: QueryStatus.fulfilled,
        data: upserted,
        isSuccess: true,
      })
    })

    test('with ignoreEarlierFetches, the request settles the status but not the data', async () => {
      const { promise, request } = startFetch()
      upsert({ keepRequestState: true, ignoreEarlierFetches: true })
      expect(selectPost()).toMatchObject({
        status: QueryStatus.pending,
        data: upserted,
      })

      request.resolve(fetched)
      await promise
      expect(selectPost()).toMatchObject({
        status: QueryStatus.fulfilled,
        data: upserted,
      })
    })
  })

  describe('keepUnusedDataTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    test.each([
      [undefined, true],
      [{ keepUnusedDataTimer: false }, true],
      [{ keepUnusedDataTimer: true }, false],
    ])(
      'with options %j, an upsert to an unused entry restarts the timer: %s',
      async (options, restarts) => {
        await fetchInitialData()
        await vi.advanceTimersByTimeAsync(40_000)

        upsert(options)
        await vi.advanceTimersByTimeAsync(25_000)

        expect(selectPost().status).toBe(
          restarts ? QueryStatus.fulfilled : QueryStatus.uninitialized,
        )

        if (restarts) {
          await vi.advanceTimersByTimeAsync(36_000)
          expect(selectPost().status).toBe(QueryStatus.uninitialized)
        }
      },
    )

    test('a new entry still gets a removal timer', async () => {
      upsert({ keepUnusedDataTimer: true })
      expect(selectPost().data).toEqual(upserted)

      await vi.advanceTimersByTimeAsync(59_000)
      expect(selectPost().data).toEqual(upserted)

      await vi.advanceTimersByTimeAsync(2_000)
      expect(selectPost().status).toBe(QueryStatus.uninitialized)
    })
  })
})
