import { createApi } from '@reduxjs/toolkit/query'
import { waitFor } from '@testing-library/react'
import { fetchBaseQuery } from '../fetchBaseQuery'
import { setupApiStore } from './helpers'
import { server } from './mocks/server'
import { rest } from 'msw'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com' }),
  endpoints: () => ({}),
})
const storeRef = setupApiStore(api)

const onStart = jest.fn()
const onSuccess = jest.fn()
const onError = jest.fn()

beforeEach(() => {
  onStart.mockClear()
  onSuccess.mockClear()
  onError.mockClear()
})

describe.each([['query'], ['mutation']] as const)(
  'generic cases: %s',
  (type) => {
    test(`${type}: onStart only`, async () => {
      const extended = api.injectEndpoints({
        overrideExisting: true,
        endpoints: (build) => ({
          injected: build[type as 'mutation']<unknown, string>({
            query: () => '/success',
            onQuery(arg) {
              onStart(arg)
            },
          }),
        }),
      })
      storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
      expect(onStart).toHaveBeenCalledWith('arg')
    })

    test(`${type}: onStart and onSuccess`, async () => {
      const extended = api.injectEndpoints({
        overrideExisting: true,
        endpoints: (build) => ({
          injected: build[type as 'mutation']<unknown, string>({
            query: () => '/success',
            async onQuery(arg, { resultPromise }) {
              onStart(arg)
              // awaiting without catching like this would result in an `unhandledRejection` exception if there was an error
              // unfortunately we cannot test for that in jest.
              const result = await resultPromise
              onSuccess(result)
            },
          }),
        }),
      })
      storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
      expect(onStart).toHaveBeenCalledWith('arg')
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ value: 'success' })
      })
    })

    test(`${type}: onStart and onError`, async () => {
      const extended = api.injectEndpoints({
        overrideExisting: true,
        endpoints: (build) => ({
          injected: build[type as 'mutation']<unknown, string>({
            query: () => '/error',
            async onQuery(arg, { resultPromise }) {
              onStart(arg)
              try {
                const result = await resultPromise
                onSuccess(result)
              } catch (e) {
                onError(e)
              }
            },
          }),
        }),
      })
      storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
      expect(onStart).toHaveBeenCalledWith('arg')
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith({
          status: 500,
          data: { value: 'error' },
        })
      })
      expect(onSuccess).not.toHaveBeenCalled()
    })
  }
)

test('query: getCacheEntry (success)', async () => {
  const snapshot = jest.fn()
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onQuery(
          arg,
          { dispatch, getState, getCacheEntry, resultPromise }
        ) {
          try {
            snapshot(getCacheEntry())
            const result = await resultPromise
            onSuccess(result)
            snapshot(getCacheEntry())
          } catch (e) {
            onError(e)
            snapshot(getCacheEntry())
          }
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )

  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled()
  })

  expect(snapshot).toHaveBeenCalledTimes(2)
  expect(snapshot.mock.calls[0][0]).toMatchObject({
    endpointName: 'injected',
    isError: false,
    isLoading: true,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    requestId: promise.requestId,
    startedTimeStamp: expect.any(Number),
    status: 'pending',
  })
  expect(snapshot.mock.calls[1][0]).toMatchObject({
    data: {
      value: 'success',
    },
    endpointName: 'injected',
    fulfilledTimeStamp: expect.any(Number),
    isError: false,
    isLoading: false,
    isSuccess: true,
    isUninitialized: false,
    originalArgs: 'arg',
    requestId: promise.requestId,
    startedTimeStamp: expect.any(Number),
    status: 'fulfilled',
  })
})

test('query: getCacheEntry (error)', async () => {
  const snapshot = jest.fn()
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error',
        async onQuery(
          arg,
          { dispatch, getState, getCacheEntry, resultPromise }
        ) {
          try {
            snapshot(getCacheEntry())
            const result = await resultPromise
            onSuccess(result)
            snapshot(getCacheEntry())
          } catch (e) {
            onError(e)
            snapshot(getCacheEntry())
          }
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )

  await waitFor(() => {
    expect(onError).toHaveBeenCalled()
  })

  expect(snapshot.mock.calls[0][0]).toMatchObject({
    endpointName: 'injected',
    isError: false,
    isLoading: true,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    requestId: promise.requestId,
    startedTimeStamp: expect.any(Number),
    status: 'pending',
  })
  expect(snapshot.mock.calls[1][0]).toMatchObject({
    error: {
      data: { value: 'error' },
      status: 500,
    },
    endpointName: 'injected',
    isError: true,
    isLoading: false,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    requestId: promise.requestId,
    startedTimeStamp: expect.any(Number),
    status: 'rejected',
  })
})

test('mutation: getCacheEntry (success)', async () => {
  const snapshot = jest.fn()
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.mutation<unknown, string>({
        query: () => '/success',
        async onQuery(
          arg,
          { dispatch, getState, getCacheEntry, resultPromise }
        ) {
          try {
            snapshot(getCacheEntry())
            const result = await resultPromise
            onSuccess(result)
            snapshot(getCacheEntry())
          } catch (e) {
            onError(e)
            snapshot(getCacheEntry())
          }
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )

  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled()
  })

  expect(snapshot).toHaveBeenCalledTimes(2)
  expect(snapshot.mock.calls[0][0]).toMatchObject({
    endpointName: 'injected',
    isError: false,
    isLoading: true,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    startedTimeStamp: expect.any(Number),
    status: 'pending',
  })
  expect(snapshot.mock.calls[1][0]).toMatchObject({
    data: {
      value: 'success',
    },
    endpointName: 'injected',
    fulfilledTimeStamp: expect.any(Number),
    isError: false,
    isLoading: false,
    isSuccess: true,
    isUninitialized: false,
    originalArgs: 'arg',
    startedTimeStamp: expect.any(Number),
    status: 'fulfilled',
  })
})

test('mutation: getCacheEntry (error)', async () => {
  const snapshot = jest.fn()
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.mutation<unknown, string>({
        query: () => '/error',
        async onQuery(
          arg,
          { dispatch, getState, getCacheEntry, resultPromise }
        ) {
          try {
            snapshot(getCacheEntry())
            const result = await resultPromise
            onSuccess(result)
            snapshot(getCacheEntry())
          } catch (e) {
            onError(e)
            snapshot(getCacheEntry())
          }
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )

  await waitFor(() => {
    expect(onError).toHaveBeenCalled()
  })

  expect(snapshot.mock.calls[0][0]).toMatchObject({
    endpointName: 'injected',
    isError: false,
    isLoading: true,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    startedTimeStamp: expect.any(Number),
    status: 'pending',
  })
  expect(snapshot.mock.calls[1][0]).toMatchObject({
    error: {
      data: { value: 'error' },
      status: 500,
    },
    endpointName: 'injected',
    isError: true,
    isLoading: false,
    isSuccess: false,
    isUninitialized: false,
    originalArgs: 'arg',
    startedTimeStamp: expect.any(Number),
    status: 'rejected',
  })
})

test('query: updateCacheEntry', async () => {
  const trackCalls = jest.fn()

  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<{ value: string }, string>({
        query: () => '/success',
        async onQuery(
          arg,
          { dispatch, getState, getCacheEntry, updateCacheEntry, resultPromise }
        ) {
          // calling `updateCacheEntry` when there is no data yet should not do anything
          // but if there is a cache value it will be updated & overwritten by the next succesful result
          updateCacheEntry((draft) => {
            draft.value += '.'
          })

          try {
            const val = await resultPromise
            onSuccess(getCacheEntry().data)
          } catch (error) {
            updateCacheEntry((draft) => {
              draft.value += 'x'
            })
            onError(getCacheEntry().data)
          }
        },
      }),
    }),
  })

  // request 1: success
  expect(onSuccess).not.toHaveBeenCalled()
  storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))

  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled()
  })
  expect(onSuccess).toHaveBeenCalledWith({ value: 'success' })
  onSuccess.mockClear()

  // request 2: error
  expect(onError).not.toHaveBeenCalled()
  server.use(
    rest.get('http://example.com/success', (_, req, ctx) =>
      req.once(ctx.status(500), ctx.json({ value: 'failed' }))
    )
  )
  storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg', { forceRefetch: true })
  )

  await waitFor(() => {
    expect(onError).toHaveBeenCalled()
  })
  expect(onError).toHaveBeenCalledWith({ value: 'success.x' })

  // request 3: success
  expect(onSuccess).not.toHaveBeenCalled()

  storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg', { forceRefetch: true })
  )

  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled()
  })
  expect(onSuccess).toHaveBeenCalledWith({ value: 'success' })
  onSuccess.mockClear()
})

test('query: will only start lifecycle if query is not skipped due to `condition`', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        onQuery(arg) {
          onStart(arg)
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )
  expect(onStart).toHaveBeenCalledTimes(1)
  storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
  expect(onStart).toHaveBeenCalledTimes(1)
  await promise
  storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg', { forceRefetch: true })
  )
  expect(onStart).toHaveBeenCalledTimes(2)
})
