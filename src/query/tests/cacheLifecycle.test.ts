import { createApi } from '@reduxjs/toolkit/query'
import { waitFor, waitForDomChange } from '@testing-library/react'
import { fetchBaseQuery } from '../fetchBaseQuery'
import { setupApiStore, waitMs } from './helpers'

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

beforeEach(() => {
  onNewCacheEntry.mockClear()
  gotFirstValue.mockClear()
  onCleanup.mockClear()
})

test('query: new cache entry only', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        onCacheEntryAdded(arg) {
          onNewCacheEntry(arg)
        },
      }),
    }),
  })
  storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')
})

test('query: cleaning up', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onCacheEntryAdded(arg, {}, { cleanup }) {
          onNewCacheEntry(arg)
          await cleanup
          onCleanup()
        },
      }),
    }),
  })
  const promise = storeRef.store.dispatch(
    extended.endpoints.injected.initiate('arg')
  )
  expect(onNewCacheEntry).toHaveBeenCalledWith('arg')
  promise.unsubscribe()
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(59000)
  await waitMs() // wait a few ticks
  expect(onCleanup).not.toHaveBeenCalled()
  jest.advanceTimersByTime(2000)
  await waitMs() // wait a few ticks
  expect(onCleanup).toHaveBeenCalled()
})

/*
onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    const value = await valueResolvedPromise
    gotFirstValue(value)
    await cleanupPromise
    onCleanup()
})
// extra scenario to test & document: 
// if cleanup happens before `valueResolvedPromise` resolves, `valueResolvedPromise` will throw, *also* skipping `onCleanup`
*/

/*
// recommended if some cleanup is always necessary:

onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    try {
      const value = await valueResolvedPromise
      gotFirstValue(value)
    } catch {
      neverGotAValue()
    }
    await cleanupPromise
    onCleanup()
})
*/

/*
// recommended if cleanup is only necessary when something was started after first value in cache:

onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    try {
      const value = await valueResolvedPromise
      gotFirstValue(value)
      await cleanupPromise
      onCleanup()
    } catch {
    }
})
*/
