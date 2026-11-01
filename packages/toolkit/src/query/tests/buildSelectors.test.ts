import { createApi, skipToken } from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { setupApiStore } from '../../tests/utils/helpers'
import type { QueryCacheKey } from '../core/apiState'

describe('query selectors', () => {
  const serializeSpy = vi.fn(({ queryArgs }: { queryArgs: string }) =>
    JSON.stringify(queryArgs),
  )

  const api = createApi({
    baseQuery: async (arg: { delayMs: number; value: string }) => {
      await delay(arg.delayMs)
      return { data: arg.value }
    },
    endpoints: (build) => ({
      getThing: build.query<string, { delayMs: number; value: string }>({
        query: (arg) => arg,
      }),
      custom: build.query<string, string>({
        query: (arg) => ({ delayMs: 1, value: arg }),
        serializeQueryArgs: serializeSpy,
      }),
    }),
  })

  const storeRef = setupApiStore(api)

  beforeEach(() => {
    serializeSpy.mockClear()
  })

  test('core selectors expose only the four status flags, and isLoading is true during a refetch', async () => {
    const { store } = storeRef
    const arg = { delayMs: 5, value: 'flags' }
    const select = api.endpoints.getThing.select(arg)

    expect(Object.keys(select(store.getState())).sort()).toEqual([
      'isError',
      'isLoading',
      'isSuccess',
      'isUninitialized',
      'status',
    ])
    expect(select(store.getState())).toMatchObject({
      isUninitialized: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })

    const promise = store.dispatch(api.endpoints.getThing.initiate(arg))
    expect(select(store.getState())).toMatchObject({
      isUninitialized: false,
      isLoading: true,
    })
    await promise
    expect(select(store.getState())).toMatchObject({
      isLoading: false,
      isSuccess: true,
    })

    // The core selectors have no isFetching, so a refetch of cached data reports isLoading
    const refetching = promise.refetch()
    const duringRefetch = select(store.getState())
    expect(duringRefetch.isLoading).toBe(true)
    expect(duringRefetch.data).toBe('flags')
    expect('isFetching' in duringRefetch).toBe(false)
    await refetching

    promise.unsubscribe()
  })

  test('skipToken does not call serializeQueryArgs, and unknown or removed entries select the same default state', async () => {
    const { store } = storeRef

    const skipped = api.endpoints.custom.select(skipToken)
    expect(serializeSpy).not.toHaveBeenCalled()

    api.endpoints.custom.select('real')
    expect(serializeSpy).toHaveBeenCalledTimes(1)

    const skippedResult = skipped(store.getState())
    const neverExisted = api.endpoints.custom.select('never-existed')(
      store.getState(),
    )
    expect(skippedResult).toEqual(neverExisted)
    expect(skippedResult).toMatchObject({
      status: 'uninitialized',
      isUninitialized: true,
    })
    expect('data' in skippedResult).toBe(false)
    expect(skipped(store.getState())).toBe(skippedResult)

    const promise = store.dispatch(
      api.endpoints.custom.initiate('removed', { subscribe: false }),
    )
    await promise
    const removedSelect = api.endpoints.custom.select('removed')
    expect(removedSelect(store.getState()).status).toBe('fulfilled')
    store.dispatch(
      api.internalActions.removeQueryResult({
        queryCacheKey: promise.queryCacheKey as QueryCacheKey,
      }),
    )
    expect(removedSelect(store.getState())).toEqual(neverExisted)
  })
})
