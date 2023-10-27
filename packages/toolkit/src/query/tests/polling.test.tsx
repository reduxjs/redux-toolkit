import { vi } from 'vitest'
import { createApi } from '@reduxjs/toolkit/query'
import { setupApiStore, waitMs } from './helpers'
import { delay } from '../../utils'
import type { SubscriptionSelectors } from '../core/buildMiddleware/types'

const mockBaseQuery = vi
  .fn()
  .mockImplementation((args: any) => ({ data: args }))

const api = createApi({
  baseQuery: mockBaseQuery,
  tagTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<unknown, number>({
      query(pageNumber) {
        return { url: 'posts', params: pageNumber }
      },
      providesTags: ['Posts'],
    }),
  }),
})
const { getPosts } = api.endpoints

const storeRef = setupApiStore(api)

let getSubscriptions: SubscriptionSelectors['getSubscriptions']

beforeEach(() => {
  ;({ getSubscriptions } = storeRef.store.dispatch(
    api.internalActions.internal_getRTKQSubscriptions()
  ) as unknown as SubscriptionSelectors)
})

const getSubscribersForQueryCacheKey = (queryCacheKey: string) =>
  getSubscriptions()[queryCacheKey] || {}
const createSubscriptionGetter = (queryCacheKey: string) => () =>
  getSubscribersForQueryCacheKey(queryCacheKey)

describe('polling tests', () => {
  it('clears intervals when seeing a resetApiState action', async () => {
    await storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      })
    )

    expect(mockBaseQuery).toHaveBeenCalledTimes(1)

    storeRef.store.dispatch(api.util.resetApiState())

    await waitMs(30)

    expect(mockBaseQuery).toHaveBeenCalledTimes(1)
  })

  it('replaces polling interval when the subscription options are updated', async () => {
    const { requestId, queryCacheKey, ...subscription } =
      storeRef.store.dispatch(
        getPosts.initiate(1, {
          subscriptionOptions: { pollingInterval: 10 },
          subscribe: true,
        })
      )

    const getSubs = createSubscriptionGetter(queryCacheKey)

    await delay(1)
    expect(Object.keys(getSubs())).toHaveLength(1)
    expect(getSubs()[requestId].pollingInterval).toBe(10)

    subscription.updateSubscriptionOptions({ pollingInterval: 20 })

    await delay(1)
    expect(Object.keys(getSubs())).toHaveLength(1)
    expect(getSubs()[requestId].pollingInterval).toBe(20)
  })

  it(`doesn't replace the interval when removing a shared query instance with a poll `, async () => {
    const subscriptionOne = storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      })
    )

    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      })
    )

    await delay(10)

    const getSubs = createSubscriptionGetter(subscriptionOne.queryCacheKey)

    expect(Object.keys(getSubs())).toHaveLength(2)

    subscriptionOne.unsubscribe()

    await delay(1)
    expect(Object.keys(getSubs())).toHaveLength(1)
  })

  it('uses lowest specified interval when two components are mounted', async () => {
    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 30000 },
        subscribe: true,
      })
    )

    storeRef.store.dispatch(
      getPosts.initiate(1, {
        subscriptionOptions: { pollingInterval: 10 },
        subscribe: true,
      })
    )

    await waitMs(20)

    expect(mockBaseQuery.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
