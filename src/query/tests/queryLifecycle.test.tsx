import { createApi } from '@reduxjs/toolkit/query'
import { waitFor } from '@testing-library/react'
import { fetchBaseQuery } from '../fetchBaseQuery'
import { setupApiStore } from './helpers'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com' }),
  endpoints: () => ({}),
})

const onStart = jest.fn()
const onSuccess = jest.fn()
const onError = jest.fn()

beforeEach(() => {
  onStart.mockClear()
  onSuccess.mockClear()
  onError.mockClear()
})

const storeRef = setupApiStore(api)

test('query: onStart only', async () => {
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
  storeRef.store.dispatch(extended.endpoints.injected.initiate('arg'))
  expect(onStart).toHaveBeenCalledWith('arg')
})

test('query: onStart and onSuccess', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/success',
        async onQuery(arg, {}, { resultPromise }) {
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

test('query: onStart, onSuccess and onError', async () => {
  const extended = api.injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      injected: build.query<unknown, string>({
        query: () => '/error',
        async onQuery(arg, {}, { resultPromise }) {
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

/*
 other test scenarios:


 cleanup happens before the query resolves -> should reject the promise

 cleanup happens before the query resolves -> should reject the promise, but the promise should not cause an unhandledRejection if not caught
*/
