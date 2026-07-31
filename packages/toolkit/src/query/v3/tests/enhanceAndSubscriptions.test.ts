/**
 * RTK Query v3 prototype: runtime tests for
 * - `addTagTypes` / `enhanceEndpoint` (split enhance methods adopted from
 *   PR #3485: merge + recipe semantics, chainability, post-hoc upserts)
 * - the sanctioned subscription-selectors accessor (replaces the per-hook
 *   render-phase `internal_getRTKQSubscriptions` dispatch)
 */
import { configureStore } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@internal/query/baseQueryTypes'
import type { GetSubscriptionSelectors } from '@internal/query/core/module'
import { internalSubscriptionsAccessor } from '@internal/query/core/module'
import { createApi } from '@internal/query/v3/index'
import { describe, expect, test, vi } from 'vitest'

interface Todo {
  id: string
  title: string
  completed: boolean
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function setup() {
  const todos: Todo[] = [
    { id: '1', title: 'one', completed: false },
    { id: '2', title: 'two', completed: true },
  ]

  const baseQuery = vi.fn(
    async (arg: string | { url: string; method?: string; body?: any }) => {
      const url = typeof arg === 'string' ? arg : arg.url
      if (url === '/todos') {
        return { data: [...todos] }
      }
      const todoMatch = /^\/todos\/(.+)$/.exec(url)
      if (todoMatch) {
        if (typeof arg === 'object' && arg.method === 'PATCH') {
          const idx = todos.findIndex((t) => t.id === todoMatch[1])
          todos[idx] = { ...todos[idx], ...arg.body }
          return { data: { ...todos[idx] } }
        }
        const found = todos.find((t) => t.id === todoMatch[1])
        return found
          ? { data: { ...found } }
          : { error: { status: 404 as const } }
      }
      return { error: { status: 500 as const } }
    },
  ) satisfies BaseQueryFn

  const baseApi = createApi({
    baseQuery,
    reducerPath: 'v3Api',
    tagTypes: ['Todo'],
  })

  const api = baseApi.injectEndpoints({
    endpoints: {
      getTodoById: baseApi.query<Todo, string>({
        request: (id) => `/todos/${id}`,
      }),
      getTodos: baseApi.query<Todo[], void>({
        request: () => '/todos',
        // Deliberately no providesTags: added later via enhanceEndpoint
      }),
      updateTodo: baseApi.mutation<Todo, { id: string; patch: Partial<Todo> }>({
        request: ({ id, patch }) => ({
          url: `/todos/${id}`,
          method: 'PATCH',
          body: patch,
        }),
        invalidatesTags: ['Todo'],
      }),
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, baseApi, store, baseQuery, todos }
}

describe('addTagTypes / enhanceEndpoint (v3)', () => {
  test('partial merge adds providesTags, observed by tag invalidation', async () => {
    const { api, store, baseQuery } = setup()

    // Without providesTags, a mutation invalidating ['Todo'] must not refetch
    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    await sub
    expect(baseQuery).toHaveBeenCalledTimes(1)

    await store.dispatch(
      api.endpoints.updateTodo.initiate({
        id: '1',
        patch: { completed: true },
      }),
    )
    await delay(10)
    expect(baseQuery).toHaveBeenCalledTimes(2) // only the mutation fetch

    // Now enhance: merge providesTags into the live definition.
    // NOTE (parity with current API): the provided-tag index is written at
    // fulfillment time, so the enhancement applies to future fulfillments —
    // the entry must be refetched once before invalidation can match it.
    api.enhanceEndpoint('getTodos', {
      providesTags: ['Todo'],
    })
    await sub.refetch()
    expect(baseQuery).toHaveBeenCalledTimes(3)

    await store.dispatch(
      api.endpoints.updateTodo.initiate({
        id: '2',
        patch: { completed: false },
      }),
    )
    await delay(10)
    // mutation fetch + invalidation-driven refetch of the subscribed query
    expect(baseQuery).toHaveBeenCalledTimes(5)

    sub.unsubscribe()
  })

  test('recipe form mutates the definition in place', async () => {
    const { api, store, baseQuery } = setup()

    api.enhanceEndpoint('getTodos', (definition) => {
      definition.transformResponse = (todos: Todo[]) =>
        todos.map((t) => ({ ...t, title: t.title.toUpperCase() }))
    })

    const result = await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(result.data?.map((t) => t.title)).toEqual(['ONE', 'TWO'])
  })

  test('recipe can replace request; the internal query alias stays in sync', async () => {
    const { api, store, baseQuery } = setup()

    api.enhanceEndpoint('getTodos', (definition) => {
      // Replace the request builder entirely. The core runtime reads
      // the definition via the `query` getter alias, which must pick up
      // the replaced `request`, not a stale copy.
      definition.request = () => '/todos/1'
    })

    const result = await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(baseQuery.mock.calls[0][0]).toBe('/todos/1')
    // Runtime returns the single todo (the endpoint type still says Todo[])
    expect(result.data).toEqual({ id: '1', title: 'one', completed: false })
  })

  test('enhanceEndpoint applies to late-injected endpoints', async () => {
    const { api, store, baseQuery } = setup()

    const extended = api.injectEndpoints({
      endpoints: {
        getTodosAgain: api.query<Todo[], void>({
          request: () => '/todos',
        }),
      },
    })

    extended.enhanceEndpoint('getTodosAgain', (definition) => {
      definition.transformResponse = (todos: Todo[]) =>
        todos.map((t) => ({ ...t, title: t.title.toUpperCase() }))
    })

    const result = await store.dispatch(
      extended.endpoints.getTodosAgain.initiate(),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(result.data?.map((t) => t.title)).toEqual(['ONE', 'TWO'])
  })

  test('addTagTypes registers new tags; unknown endpoint names are ignored', async () => {
    const { api, store, baseQuery } = setup()

    expect(() =>
      (api.enhanceEndpoint as any)('nonexistentEndpoint', {
        providesTags: ['Stats'],
      }),
    ).not.toThrow()

    // New tag is usable: widen the api's tags, enhance getTodos to provide
    // the new tag, and observe an invalidation-driven refetch.
    const enhanced = api
      .addTagTypes('Stats')
      .enhanceEndpoint('getTodos', { providesTags: ['Stats'] })

    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    await sub
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // The returned api's tag union includes 'Stats' — no cast needed.
    store.dispatch(enhanced.util.invalidateTags(['Stats']))
    await delay(10)
    expect(baseQuery).toHaveBeenCalledTimes(2)

    sub.unsubscribe()
  })

  test('enhanceEndpoint can add a cross-endpoint upsert post-hoc', async () => {
    const { api, store, baseQuery } = setup()

    api.enhanceEndpoint('getTodos', {
      upsert: (todos) =>
        todos.map((t) => ({
          endpoint: 'getTodoById' as const,
          arg: t.id,
          value: t,
        })),
    })

    await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // The list fetch seeded the byId entries: served from cache, no fetch.
    const byId = store.dispatch(api.endpoints.getTodoById.initiate('1'))
    const result = await byId
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ id: '1', title: 'one', completed: false })
    byId.unsubscribe()
  })
})

describe('subscription selectors accessor (v3 / core)', () => {
  test('reads live subscription state without per-consumer dispatches', async () => {
    const { api, store } = setup()

    const getSubscriptionSelectors = (api as any)[
      internalSubscriptionsAccessor
    ] as GetSubscriptionSelectors
    expect(typeof getSubscriptionSelectors).toBe('function')

    const selectors = getSubscriptionSelectors(store.dispatch)

    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    const { queryCacheKey, requestId } = sub

    expect(selectors.isRequestSubscribed(queryCacheKey, requestId)).toBe(true)
    expect(selectors.getSubscriptionCount(queryCacheKey)).toBe(1)

    await sub
    sub.unsubscribe()

    expect(selectors.isRequestSubscribed(queryCacheKey, requestId)).toBe(false)
    expect(selectors.getSubscriptionCount(queryCacheKey)).toBe(0)

    // Cached per store: same selectors object on repeat calls
    expect(getSubscriptionSelectors(store.dispatch)).toBe(selectors)
  })

  test('throws the missing-middleware error in development', () => {
    const { api } = setup()

    const storeWithoutMiddleware = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
    })

    const getSubscriptionSelectors = (api as any)[
      internalSubscriptionsAccessor
    ] as GetSubscriptionSelectors

    expect(() =>
      getSubscriptionSelectors(storeWithoutMiddleware.dispatch),
    ).toThrowError(/has not been added to the store/)
  })
})
