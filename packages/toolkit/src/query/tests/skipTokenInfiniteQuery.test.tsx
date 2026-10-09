import { setupApiStore } from '@internal/tests/utils/helpers'
import { skipToken } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay } from 'msw'
import * as React from 'react'
import { describe, expect, test, vi } from 'vitest'

/**
 * reduxjs/redux-toolkit#5028
 *
 * `useInfiniteQuery(skipToken)` correctly suppresses the automatic subscription, but the
 * `fetchNextPage()` / `fetchPreviousPage()` functions returned by the same hook forwarded
 * `skipToken` straight to `initiate()`, which dispatched a real request.
 */
describe('useInfiniteQuery respects skipToken in its imperative triggers', () => {
  function setup() {
    const baseQuery = vi.fn(async (arg: any) => ({
      data: { items: [`item-${baseQuery.mock.calls.length}`] },
    }))

    const api = createApi({
      baseQuery: baseQuery as any,
      endpoints: (build) => ({
        listThings: build.infiniteQuery<any, string, number>({
          query: () => ({ url: '/things' }),
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: () => undefined,
            getPreviousPageParam: () => undefined,
          },
        }),
      }),
    })

    const storeRef = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    return { api, baseQuery, storeRef }
  }

  test('control: a real arg fetches the first page', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery('fire'),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(baseQuery).toHaveBeenCalledOnce()
  })

  test('useInfiniteQuery(skipToken) does not fetch on mount', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery(skipToken),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isUninitialized).toBe(true))
    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('fetchNextPage() does not fetch while the arg is skipToken', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery(skipToken),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isUninitialized).toBe(true))

    act(() => {
      result.current.fetchNextPage()
    })

    // Give a would-be request time to reach the base query.
    await act(async () => {
      await delay(50)
    })

    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('fetchPreviousPage() does not fetch while the arg is skipToken', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery(skipToken),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isUninitialized).toBe(true))

    act(() => {
      result.current.fetchPreviousPage()
    })

    await act(async () => {
      await delay(50)
    })

    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('repeated fetchNextPage() calls never fetch while skipped', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery(skipToken),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isUninitialized).toBe(true))

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.fetchNextPage()
      })
      await act(async () => {
        await delay(20)
      })
    }

    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('skip: true behaves the same as skipToken for fetchNextPage()', async () => {
    const { api, baseQuery, storeRef } = setup()

    const { result } = renderHook(
      () => api.endpoints.listThings.useInfiniteQuery('fire', { skip: true }),
      { wrapper: storeRef.wrapper },
    )

    await waitFor(() => expect(result.current.isUninitialized).toBe(true))

    act(() => {
      result.current.fetchNextPage()
    })

    await act(async () => {
      await delay(50)
    })

    expect(baseQuery).not.toHaveBeenCalled()
  })
})
