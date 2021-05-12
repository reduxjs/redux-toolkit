import { createApi } from '@reduxjs/toolkit/query'
import { fetchBaseQuery } from '../fetchBaseQuery'
import { fakeTimerWaitFor, setupApiStore, waitMs } from './helpers'

beforeAll(() => {
  jest.useFakeTimers()
})

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com' }),
  endpoints: () => ({}),
})
const storeRef = setupApiStore(api)

const onNewCacheEntry = jest.fn()
const gotFirstValue = jest.fn()
const onCleanup = jest.fn()
const onCatch = jest.fn()

beforeEach(() => {
  onNewCacheEntry.mockClear()
  gotFirstValue.mockClear()
  onCleanup.mockClear()
  onCatch.mockClear()
})

test('query: new cache entry only', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        onCacheEntryAdded(arg, { dispatch, getState }) {
          onNewCacheEntry(arg)
        },
      }),
    }),
  })
  storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')
})

test('query: await cleanup', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onCacheEntryAdded(arg, { dispatch, getState }, { cleanup }) {
          onNewCacheEntry(arg)
          await cleanup
          onCleanup()
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()

  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(59000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000), await waitMs()
  expect(onCleanup).toHaveBeenCalled()
})

test('query: await firstValueResolved, await cleanup (success)', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onCacheEntryAdded(
          arg,
          { dispatch, getState },
          { cleanup, firstValueResolved }
        ) {
          onNewCacheEntry(arg)
          const firstValue = await firstValueResolved
          gotFirstValue(firstValue)
          await cleanup
          onCleanup()
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')

  expect(gotFirstValue).not.toHaveBeenCalled()
  expect(onCleanup).not.toHaveBeenCalled()

  await fakeTimerWaitFor(() => {
    expect(gotFirstValue).toHaveBeenCalled()
  })
  expect(gotFirstValue).toHaveBeenCalledWith({ value: 'success' })
  expect(onCleanup).not.toHaveBeenCalled()

  jest.advanceTimersByTime(59000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000), await waitMs()
  expect(onCleanup).toHaveBeenCalled()
})

test('query: await firstValueResolved, await cleanup (firstValueResolved never resolves)', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error', // we will initiate only once and that one time will be an error -> firstValueResolved will never resolve
        async onCacheEntryAdded(
          arg,
          { dispatch, getState },
          { cleanup, firstValueResolved }
        ) {
          onNewCacheEntry(arg)
          // this will wait until cleanup, then reject => nothing past that line will execute
          // but since this special "cleanup" rejection is handled outside, there will be no
          // uncaught rejection error
          const firstValue = await firstValueResolved
          gotFirstValue(firstValue)
          await cleanup
          onCleanup()
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')

  jest.advanceTimersByTime(120000), await waitMs()
  expect(gotFirstValue).not.toHaveBeenCalled()
  expect(onCleanup).not.toHaveBeenCalled()
})

test('query: try { await firstValueResolved }, await cleanup (firstValueResolved never resolves)', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error', // we will initiate only once and that one time will be an error -> firstValueResolved will never resolve
        async onCacheEntryAdded(
          arg,
          { dispatch, getState },
          { cleanup, firstValueResolved }
        ) {
          onNewCacheEntry(arg)

          try {
            // this will wait until cleanup, then reject => nothing else in this try..catch block will execute
            const firstValue = await firstValueResolved
            gotFirstValue(firstValue)
          } catch (e) {
            onCatch(e)
          }
          await cleanup
          onCleanup()
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')

  jest.advanceTimersByTime(59000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000), await waitMs()
  expect(onCleanup).toHaveBeenCalled()
  expect(gotFirstValue).not.toHaveBeenCalled()
  expect(onCatch.mock.calls[0][0]).toMatchObject({
    message: 'Promise never resolved before cleanup.',
  })
})

test('query: try { await firstValueResolved, await cleanup } (firstValueResolved never resolves)', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error', // we will initiate only once and that one time will be an error -> firstValueResolved will never resolve
        async onCacheEntryAdded(
          arg,
          { dispatch, getState },
          { cleanup, firstValueResolved }
        ) {
          onNewCacheEntry(arg)

          try {
            // this will wait until cleanup, then reject => nothing else in this try..catch block will execute
            const firstValue = await firstValueResolved
            gotFirstValue(firstValue)
            // cleanup in this scenario only needs to be done for stuff within this try..catch block - totally valid scenario
            await cleanup
            onCleanup()
          } catch (e) {
            onCatch(e)
          }
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')

  jest.advanceTimersByTime(59000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  expect(gotFirstValue).not.toHaveBeenCalled()
  expect(onCatch.mock.calls[0][0]).toMatchObject({
    message: 'Promise never resolved before cleanup.',
  })
})

test('query: try { await firstValueResolved } finally { await cleanup } (firstValueResolved never resolves)', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error', // we will initiate only once and that one time will be an error -> firstValueResolved will never resolve
        async onCacheEntryAdded(
          arg,
          { dispatch, getState },
          { cleanup, firstValueResolved }
        ) {
          onNewCacheEntry(arg)

          try {
            // this will wait until cleanup, then reject => nothing else in this try..catch block will execute
            const firstValue = await firstValueResolved
            gotFirstValue(firstValue)
          } catch (e) {
            onCatch(e)
          } finally {
            await cleanup
            onCleanup()
          }
        },
      }),
    }),
  })
  storeRef.store
    .dispatch(extended.endpoints.injected.initiate('arg'))
    .unsubscribe()
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')

  jest.advanceTimersByTime(59000), await waitMs()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000), await waitMs()
  expect(onCleanup).toHaveBeenCalled()
  expect(gotFirstValue).not.toHaveBeenCalled()
  expect(onCatch.mock.calls[0][0]).toMatchObject({
    message: 'Promise never resolved before cleanup.',
  })
})

test('getCacheEntry', async () => {
  const snapshot = jest.fn()
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onCacheEntryAdded(
          arg,
          { dispatch, getState, getCacheEntry },
          { cleanup, firstValueResolved }
        ) {
          snapshot(getCacheEntry())
          gotFirstValue(await firstValueResolved)
          snapshot(getCacheEntry())
          await cleanup
          snapshot(getCacheEntry())
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )
  promise.unsubscribe()

  await fakeTimerWaitFor(() => {
    expect(gotFirstValue).toHaveBeenCalled()
  })

  jest.advanceTimersByTime(120000), await waitMs()

  expect(snapshot).toHaveBeenCalledTimes(3)
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
  expect(snapshot.mock.calls[2][0]).toMatchObject({
    isError: false,
    isLoading: false,
    isSuccess: false,
    isUninitialized: true,
    status: 'uninitialized',
  })
})

test('updateCacheEntry', async () => {
  const trackCalls = jest.fn()

  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<{ value: string }, string>({
        query: () => '/success',
        async onCacheEntryAdded(
          arg,
          { dispatch, getState, getCacheEntry, updateCacheEntry },
          { cleanup, firstValueResolved }
        ) {
          expect(getCacheEntry().data).toEqual(undefined)
          // calling `updateCacheEntry` when there is no data yet should not do anything
          updateCacheEntry((draft) => {
            draft.value = 'TEST'
            trackCalls()
          })
          expect(trackCalls).toHaveBeenCalledTimes(0)
          expect(getCacheEntry().data).toEqual(undefined)

          gotFirstValue(await firstValueResolved)

          expect(getCacheEntry().data).toEqual({ value: 'success' })
          updateCacheEntry((draft) => {
            draft.value = 'TEST'
            trackCalls()
          })
          expect(trackCalls).toHaveBeenCalledTimes(1)
          expect(getCacheEntry().data).toEqual({ value: 'TEST' })

          await cleanup

          expect(getCacheEntry().data).toEqual(undefined)
          // calling `updateCacheEntry` when there is no data any more should not do anything
          updateCacheEntry((draft) => {
            draft.value = 'TEST2'
            trackCalls()
          })
          expect(trackCalls).toHaveBeenCalledTimes(1)
          expect(getCacheEntry().data).toEqual(undefined)

          onCleanup()
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )
  promise.unsubscribe()

  await fakeTimerWaitFor(() => {
    expect(gotFirstValue).toHaveBeenCalled()
  })

  jest.advanceTimersByTime(61000)

  await fakeTimerWaitFor(() => {
    expect(onCleanup).toHaveBeenCalled()
  })
})

test('dispatching further actions does not trigger another lifecycle', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, void>({
        query: () => '/success',
        async onCacheEntryAdded() {
          onNewCacheEntry()
        },
      }),
    }),
  })
  await storeRef.store.dispatch(extended.endpoints.injected.initiate())
  expect(onNewCacheEntry).toHaveBeenCalledTimes(1)

  await storeRef.store.dispatch(extended.endpoints.injected.initiate())
  expect(onNewCacheEntry).toHaveBeenCalledTimes(1)

  await storeRef.store.dispatch(
    extended.endpoints.injected.initiate(undefined, { forceRefetch: true })
  )
  expect(onNewCacheEntry).toHaveBeenCalledTimes(1)
})
