/**
 * RTK Query v3 prototype: runtime tests for
 * - `enhanceEndpoints` (merge + recipe semantics, addTagTypes)
 * - the sanctioned subscription-selectors accessor (replaces the per-hook
 *   render-phase `internal_getRTKQSubscriptions` dispatch)
 */
import { configureStore } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@internal/query/baseQueryTypes'
import type { GetSubscriptionSelectors } from '@internal/query/core/module'
import { internalSubscriptionsAccessor } from '@internal/query/core/module'
import { createApi, mutation, query } from '@internal/query/v3/index'
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

  const api = createApi({
    baseQuery,
    reducerPath: 'v3Api',
    tagTypes: ['Todo'],
    endpoints: {
      getTodos: {
        ...query<Todo[], void>(),
        query: () => '/todos',
        // Deliberately no providesTags: added later via enhanceEndpoints
      },
      updateTodo: {
        ...mutation<Todo, { id: string; patch: Partial<Todo> }>(),
        query: ({ id, patch }) => ({
          url: `/todos/${id}`,
          method: 'PATCH',
          body: patch,
        }),
        invalidatesTags: ['Todo'],
      },
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, store, baseQuery, todos }
}

describe('enhanceEndpoints (v3)', () => {
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
    api.enhanceEndpoints({
      endpoints: {
        getTodos: {
          providesTags: ['Todo'],
        },
      },
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

    api.enhanceEndpoints({
      endpoints: {
        getTodos: (definition) => {
          definition.transformResponse = (todos: Todo[]) =>
            todos.map((t) => ({ ...t, title: t.title.toUpperCase() }))
        },
      },
    })

    const result = await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)
    expect(result.data?.map((t) => t.title)).toEqual(['ONE', 'TWO'])
  })

  test('addTagTypes registers new tags; unknown endpoint names are ignored', async () => {
    const { api, store, baseQuery } = setup()

    expect(() =>
      api.enhanceEndpoints({
        addTagTypes: ['Stats'],
        endpoints: {
          // @ts-expect-error unknown endpoint name — runtime must ignore it
          nonexistentEndpoint: { providesTags: ['Stats'] },
        },
      }),
    ).not.toThrow()

    // New tag is usable: enhance getTodos to provide it, inject an endpoint
    // whose fetch invalidates it, and observe the refetch.
    const enhanced = api.enhanceEndpoints({ addTagTypes: ['Stats'] })
    enhanced.enhanceEndpoints({
      endpoints: {
        getTodos: { providesTags: ['Stats'] },
      },
    })

    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    await sub
    expect(baseQuery).toHaveBeenCalledTimes(1)

    store.dispatch(
      enhanced.util.invalidateTags(['Stats' as unknown as 'Todo']),
    )
    await delay(10)
    expect(baseQuery).toHaveBeenCalledTimes(2)

    sub.unsubscribe()
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
