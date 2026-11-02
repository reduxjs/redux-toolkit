import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import * as React from 'react'
import { Provider } from 'react-redux'

import { server } from '@internal/query/tests/mocks/server'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<{ id: number; name: string }, number>({
      query: (id) => `/post/${id}`,
    }),
  }),
})

function makeStore() {
  return configureStore({
    reducer: { api: api.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })
}

describe('query hooks after a Provider store swap (issue #5540)', () => {
  test('useQuery subscribes against the new store after a swap', async () => {
    server.use(
      http.get('https://example.com/post/21', () =>
        HttpResponse.json({ id: 21, name: 'post-21' }),
      ),
    )

    const storeA = makeStore()
    const storeB = makeStore()
    let currentStore = storeA

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useQuery(21),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    currentStore = storeB
    rerender()

    // Bug: hook stays pending and no request reaches storeB
    await waitFor(() => expect(result.current.isSuccess).toBe(true), {
      timeout: 3000,
    })
    expect(
      api.endpoints.getPost.select(21)(storeB.getState() as any)?.status,
    ).toBe('fulfilled')
  })

  test('useLazyQuery re-runs the last trigger against the new store after a swap', async () => {
    server.use(
      http.get('https://example.com/post/22', () =>
        HttpResponse.json({ id: 22, name: 'post-22' }),
      ),
    )

    const storeA = makeStore()
    const storeB = makeStore()
    let currentStore = storeA

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    const { result, rerender } = renderHook(
      () => api.endpoints.getPost.useLazyQuery(),
      { wrapper: Wrapper },
    )

    const [trigger] = result.current
    trigger(22)
    await waitFor(() => expect(result.current[1].isSuccess).toBe(true))

    currentStore = storeB
    rerender()

    await waitFor(() => expect(result.current[1].isSuccess).toBe(true), {
      timeout: 3000,
    })
    expect(
      api.endpoints.getPost.select(22)(storeB.getState() as any)?.status,
    ).toBe('fulfilled')
  })
})
