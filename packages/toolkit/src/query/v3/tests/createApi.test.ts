/**
 * RTK Query v3 prototype: runtime behavior tests for the core (non-React)
 * builder + createApi. Parity checks against existing RTKQ behavior:
 * fetching, caching, dedup, transformResponse, queryFn, tag invalidation,
 * injectEndpoints.
 */
import { configureStore } from '@reduxjs/toolkit'
import type { BaseQueryFn } from '@internal/query/baseQueryTypes'
import { createApiBuilder } from '@internal/query/v3/index'
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

  const build = createApiBuilder({
    baseQuery,
    reducerPath: 'v3Api',
    tagTypes: ['Todo'],
  })

  const api = build.createApi({
    endpoints: {
      getTodoById: {
        kind: build.query<Todo, string>({
          request: (id) => `/todos/${id}`,
          providesTags: (result, error, id) => [{ type: 'Todo' as const, id }],
        }),
      },
      getTodos: {
        kind: build.query<Todo[], void, { todos: Todo[]; total: number }>({
          request: () => '/todos',
          transformResponse: (raw) => raw.todos,
          providesTags: ['Todo'],
        }),
      },
      getViaQueryFn: {
        kind: build.query.fn<string, number>({
          queryFn: async (arg) => {
            return { data: `computed-${arg}` }
          },
        }),
      },
      updateTodo: {
        kind: build.mutation<Todo, { id: string } & Partial<Todo>>({
          request: ({ id, ...patch }) => ({
            url: `/todos/${id}`,
            method: 'PATCH',
            body: patch,
          }),
          invalidatesTags: (result, error, { id }) => [
            { type: 'Todo' as const, id },
            'Todo',
          ],
        }),
      },
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, build, store, baseQuery, todos }
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
    const { api, build, store } = setup()

    const extended = api.injectEndpoints({
      endpoints: {
        getTodoTitle: {
          kind: build.query.fn<string, string>({
            queryFn: async (id) => ({ data: `title-of-${id}` }),
          }),
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

  test('bare-form cells work end to end (no { kind } shell)', async () => {
    const { build, store, baseQuery } = setup()

    const bareApi = build.createApi({
      endpoints: {
        // bare form: the creator result assigned directly
        getTodoDirect: build.query<Todo, string>({
          request: (id) => `/todos/${id}`,
        }),
        // wrapped form in the same map
        getGreeting: {
          kind: build.query.fn<string, string>({
            queryFn: async (name) => ({ data: `hello ${name}` }),
          }),
        },
      },
    })
    // note: bareApi shares the builder's reducerPath with `api` from setup();
    // only bareApi's middleware/reducer are mounted here
    const bareStore = configureStore({
      reducer: { [bareApi.reducerPath]: bareApi.reducer },
      middleware: (gDM) => gDM().concat(bareApi.middleware),
    })

    const todo = await bareStore.dispatch(
      bareApi.endpoints.getTodoDirect.initiate('1'),
    )
    expect(todo.data).toEqual({ id: '1', title: 'one', completed: false })
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const greeting = await bareStore.dispatch(
      bareApi.endpoints.getGreeting.initiate('tim'),
    )
    expect(greeting.data).toBe('hello tim')
    void store
  })

  test('injectEndpoints skips colliding endpoints by default and warns in dev', async () => {
    const { api, build, store, baseQuery } = setup()

    vi.stubEnv('NODE_ENV', 'development')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    try {
      api.injectEndpoints({
        endpoints: {
          getTodoById: {
            kind: build.query.fn<Todo, string>({
              queryFn: async (id) => ({
                data: { id, title: 'replaced', completed: true },
              }),
            }),
          },
        },
      })
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          'already-existing endpointName getTodoById',
        ),
      )
    } finally {
      consoleError.mockRestore()
      vi.unstubAllEnvs()
    }

    // Original definition still in effect: fetches through baseQuery
    const result = await store.dispatch(
      api.endpoints.getTodoById.initiate('1'),
    )
    expect(result.data).toEqual({ id: '1', title: 'one', completed: false })
    expect(baseQuery).toHaveBeenCalledTimes(1)
  })

  test('injectEndpoints overrideExisting: true replaces the endpoint definition', async () => {
    const { api, build, store, baseQuery } = setup()

    api.injectEndpoints({
      endpoints: {
        getTodoById: {
          kind: build.query.fn<Todo, string>({
            queryFn: async (id) => ({
              data: { id, title: 'replaced', completed: true },
            }),
          }),
        },
      },
      overrideExisting: true,
    })

    const result = await store.dispatch(
      api.endpoints.getTodoById.initiate('1'),
    )
    expect(result.data).toEqual({ id: '1', title: 'replaced', completed: true })
    // The replacement is a queryFn endpoint — baseQuery must not be hit
    expect(baseQuery).not.toHaveBeenCalled()
  })

  test("injectEndpoints overrideExisting: 'throw' throws on collision", () => {
    const { api, build } = setup()

    expect(() =>
      api.injectEndpoints({
        endpoints: {
          getTodoById: {
            kind: build.query<Todo, string>({
              request: (id) => `/todos/${id}`,
            }),
          },
        },
        overrideExisting: 'throw',
      }),
    ).toThrowError(/already-existing endpointName getTodoById/)
  })
})

// The cross-endpoint `upsert` option runtime is covered in ./upsert.test.ts
