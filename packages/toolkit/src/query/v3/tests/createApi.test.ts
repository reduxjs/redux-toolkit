/**
 * RTK Query v3 prototype: runtime behavior tests for the core (non-React)
 * createApi. Parity checks against existing RTKQ behavior: fetching, caching,
 * dedup, transformResponse, queryFn, tag invalidation, injectEndpoints.
 */
import { configureStore } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@internal/query/baseQueryTypes'
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
        return { data: { todos: [...todos], total: todos.length } }
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
      getTodoById: {
        ...query<Todo, string>(),
        query: (id) => `/todos/${id}`,
        providesTags: (result, error, id) => [{ type: 'Todo' as const, id }],
      },
      getTodos: {
        ...query<Todo[], void, { todos: Todo[]; total: number }>(),
        query: () => '/todos',
        transformResponse: (raw) => raw.todos,
        providesTags: ['Todo'],
      },
      getViaQueryFn: {
        ...query<string, number>(),
        queryFn: async (arg) => {
          return { data: `computed-${arg}` }
        },
      },
      updateTodo: {
        ...mutation<Todo, { id: string } & Partial<Todo>>(),
        query: ({ id, ...patch }) => ({
          url: `/todos/${id}`,
          method: 'PATCH',
          body: patch,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: 'Todo' as const, id },
          'Todo',
        ],
      },
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, store, baseQuery, todos }
}

describe('v3 createApi runtime', () => {
  test('api object has the core surface and null $types', () => {
    const { api } = setup()
    expect(api.reducerPath).toBe('v3Api')
    expect(typeof api.reducer).toBe('function')
    expect(typeof api.middleware).toBe('function')
    expect(typeof api.util.invalidateTags).toBe('function')
    expect(typeof api.endpoints.getTodos.initiate).toBe('function')
    expect(api.$types).toBeNull()
  })

  test('basic query: fetches, caches, and dedupes', async () => {
    const { api, store, baseQuery } = setup()

    const result = await store.dispatch(api.endpoints.getTodoById.initiate('1'))
    expect(result.status).toBe('fulfilled')
    expect(result.data).toEqual({ id: '1', title: 'one', completed: false })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // Second initiate for the same arg is served from cache
    const second = await store.dispatch(
      api.endpoints.getTodoById.initiate('1'),
    )
    expect(second.data).toEqual(result.data)
    expect(baseQuery).toHaveBeenCalledTimes(1)

    // Different arg fetches
    await store.dispatch(api.endpoints.getTodoById.initiate('2'))
    expect(baseQuery).toHaveBeenCalledTimes(2)

    const selected = api.endpoints.getTodoById.select('1')(store.getState())
    expect(selected.isSuccess).toBe(true)
    expect(selected.data).toEqual({ id: '1', title: 'one', completed: false })
  })

  test('transformResponse is applied', async () => {
    const { api, store } = setup()
    const result = await store.dispatch(api.endpoints.getTodos.initiate())
    expect(result.data).toEqual([
      { id: '1', title: 'one', completed: false },
      { id: '2', title: 'two', completed: true },
    ])
  })

  test('queryFn endpoints work', async () => {
    const { api, store, baseQuery } = setup()
    const result = await store.dispatch(api.endpoints.getViaQueryFn.initiate(5))
    expect(result.data).toBe('computed-5')
    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('mutation runs and invalidates subscribed queries', async () => {
    const { api, store, baseQuery } = setup()

    // Subscribe (keeps the cache entry alive and refetch-eligible)
    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    await sub
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const mutationResult = await store.dispatch(
      api.endpoints.updateTodo.initiate({ id: '1', completed: true }),
    )
    expect('data' in mutationResult && mutationResult.data).toEqual({
      id: '1',
      title: 'one',
      completed: true,
    })

    // Invalidation triggers a refetch of the subscribed getTodos query
    await delay(10)
    const selected = api.endpoints.getTodos.select()(store.getState())
    expect(selected.data).toEqual([
      { id: '1', title: 'one', completed: true },
      { id: '2', title: 'two', completed: true },
    ])
    // 1 initial getTodos + 1 updateTodo + 1 refetch
    expect(baseQuery).toHaveBeenCalledTimes(3)

    sub.unsubscribe()
  })

  test('unsubscribed cache entries are removed on invalidation instead of refetched', async () => {
    const { api, store, baseQuery } = setup()

    // subscribe: false -> no subscription
    await store.dispatch(
      api.endpoints.getTodos.initiate(undefined, { subscribe: false }),
    )
    expect(baseQuery).toHaveBeenCalledTimes(1)

    await store.dispatch(
      api.endpoints.updateTodo.initiate({ id: '1', completed: true }),
    )
    await delay(10)

    const selected = api.endpoints.getTodos.select()(store.getState())
    expect(selected.isUninitialized).toBe(true)
    // No refetch happened (just the mutation call)
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })

  test('injectEndpoints adds working endpoints at runtime', async () => {
    const { api, store } = setup()

    const extended = api.injectEndpoints({
      endpoints: {
        getTodoTitle: {
          ...query<string, string>(),
          queryFn: async (id) => ({ data: `title-of-${id}` }),
        },
      },
    })

    const result = await store.dispatch(
      extended.endpoints.getTodoTitle.initiate('7'),
    )
    expect(result.data).toBe('title-of-7')

    // Original endpoints still work on the extended reference
    const todo = await store.dispatch(
      extended.endpoints.getTodoById.initiate('2'),
    )
    expect(todo.data).toEqual({ id: '2', title: 'two', completed: true })
  })

})

// The cross-endpoint `upsert` option runtime is covered in ./upsert.test.ts
