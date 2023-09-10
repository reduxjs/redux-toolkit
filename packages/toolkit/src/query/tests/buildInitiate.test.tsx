import { createApi } from '../core'
import { fakeBaseQuery } from '../fakeBaseQuery'
import { setupApiStore } from './helpers'

let calls = 0
const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    increment: build.query<number, void>({
      async queryFn() {
        const data = calls++
        await Promise.resolve()
        return { data }
      },
    }),
    failing: build.query<void, void>({
      async queryFn() {
        await Promise.resolve()
        return { error: { status: 500, data: 'error' } }
      },
    }),
  }),
})

const storeRef = setupApiStore(api)

test('multiple synchonrous initiate calls with pre-existing cache entry', async () => {
  const { store, api } = storeRef
  // seed the store
  const firstValue = await store.dispatch(api.endpoints.increment.initiate())

  expect(firstValue).toMatchObject({ data: 0, status: 'fulfilled' })

  // dispatch another increment
  const secondValuePromise = store.dispatch(api.endpoints.increment.initiate())
  // and one with a forced refresh
  const thirdValuePromise = store.dispatch(
    api.endpoints.increment.initiate(undefined, { forceRefetch: true })
  )
  // and another increment
  const fourthValuePromise = store.dispatch(api.endpoints.increment.initiate())

  const secondValue = await secondValuePromise
  const thirdValue = await thirdValuePromise
  const fourthValue = await fourthValuePromise

  expect(secondValue).toMatchObject({
    data: firstValue.data,
    status: 'fulfilled',
    requestId: firstValue.requestId,
  })

  expect(thirdValue).toMatchObject({ data: 1, status: 'fulfilled' })
  expect(thirdValue.requestId).not.toBe(firstValue.requestId)
  expect(fourthValue).toMatchObject({
    data: thirdValue.data,
    status: 'fulfilled',
    requestId: thirdValue.requestId,
  })
})

describe('calling initiate without a cache entry, with subscribe: false still returns correct values', () => {
  test('successful query', async () => {
    const { store, api } = storeRef
    calls = 0
    const promise = store.dispatch(
      api.endpoints.increment.initiate(undefined, { subscribe: false })
    )
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'increment(undefined)',
          requestId: promise.requestId,
        })
      )
    ).toBe(false)
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'increment(undefined)',
          requestId: `${promise.requestId}_running`,
        })
      )
    ).toBe(true)

    await expect(promise).resolves.toMatchObject({
      data: 0,
      status: 'fulfilled',
    })
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'increment(undefined)',
          requestId: `${promise.requestId}_running`,
        })
      )
    ).toBe(false)
  })

  test('rejected query', async () => {
    const { store, api } = storeRef
    calls = 0
    const promise = store.dispatch(
      api.endpoints.failing.initiate(undefined, { subscribe: false })
    )
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'failing(undefined)',
          requestId: promise.requestId,
        })
      )
    ).toBe(false)
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'failing(undefined)',
          requestId: `${promise.requestId}_running`,
        })
      )
    ).toBe(true)

    await expect(promise).resolves.toMatchObject({
      status: 'rejected',
    })
    expect(
      store.dispatch(
        api.internalActions.internal_probeSubscription({
          queryCacheKey: 'failing(undefined)',
          requestId: `${promise.requestId}_running`,
        })
      )
    ).toBe(false)
  })
})
