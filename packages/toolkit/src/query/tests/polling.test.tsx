import { createApi } from '@reduxjs/toolkit/query'
import { actionsReducer, setupApiStore, waitMs } from './helpers'

const baseQuery = (args?: any) => ({ data: args })
const api = createApi({
  baseQuery,
  tagTypes: ['Posts'],
  endpoints: (build) => ({
    getPosts: build.query<unknown, number>({
      query(pageNumber) {
        return { url: 'posts', params: pageNumber }
      },
      providesTags: ['Posts'],
    })
  }),
})
const { getPosts } = api.endpoints

const storeRef = setupApiStore(api, {
  ...actionsReducer,
})

describe('polling tests', () => {
  test('resetApiState clears intervals', async () => {
    await storeRef.store.dispatch(
      getPosts.initiate(1, { subscriptionOptions: { pollingInterval: 1000 } })
    )

    storeRef.store.dispatch(api.util.resetApiState())

    const { subscriptions } = storeRef.store.getState().api
    const key = 'getPosts(1)'
    expect(subscriptions).toHaveProperty(key) // TODO: key is gone after resetApiState. Expected?
    expect(subscriptions[key]?.pollingInterval).toBeFalsy()
  })

  test('arg change replaces polling interval', async () => {
    /**
     * TODO
     * - start query
     * - change query arg
     */
  })

  test(`removing a shared query instance with a poll doesn't replace the interval`, async () => {
    // TODO
  })

  test('use lowest specified interval when two components are mounted', async () => {
    // TODO
  })
})

