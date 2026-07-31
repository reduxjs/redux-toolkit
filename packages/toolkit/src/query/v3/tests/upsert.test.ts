/**
 * RTK Query v3 prototype: runtime tests for the typed cross-endpoint
 * `upsert` endpoint option (the auto-derived upserts capability from
 * RTK issue #5073).
 *
 * A query endpoint declares a sync transform from its own result into
 * `{ endpoint, arg, value }` descriptors targeting other query endpoints;
 * after each fulfilled fetch the descriptors are written through the
 * existing `api.util.upsertQueryEntries` path. The `upsert` option lives
 * in the endpoint shell next to `kind` — it is the one option typed
 * against ALL endpoints, so it stays in the reverse-mapped outer layer.
 */
import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@internal/query/v3/index'
import { describe, expect, test, vi } from 'vitest'

interface Todo {
  id: string
  title: string
  completed: boolean
}

function setup() {
  const todos: Todo[] = [
    { id: '1', title: 'one', completed: false },
    { id: '2', title: 'two', completed: true },
  ]

  const baseQuery = vi.fn(async (arg: string) => {
    if (arg === '/todos') {
      return { data: todos.map((t) => ({ ...t })) }
    }
    const match = /^\/todos\/(.+)$/.exec(arg)
    const found = todos.find((t) => t.id === match?.[1])
    return found ? { data: { ...found } } : { error: { status: 404 as const } }
  })

  const baseApi = createApi({
    baseQuery,
    reducerPath: 'upsertApi',
  })

  const api = baseApi.injectEndpoints({
    endpoints: {
      getTodoById: baseApi.query<Todo, string>({
        request: (id) => `/todos/${id}`,
      }),
      getTodos: {
        kind: baseApi.query<Todo[], void>({
          request: () => '/todos',
        }),
        upsert: (result) =>
          result.map((todo) => ({
            endpoint: 'getTodoById' as const,
            arg: todo.id,
            value: todo,
          })),
      },
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, baseApi, store, baseQuery, todos }
}

describe('v3 upsert option', () => {
  test('fulfilled list query seeds per-item cache entries', async () => {
    const { api, store, baseQuery } = setup()

    await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const state = store.getState()
    const one = api.endpoints.getTodoById.select('1')(state)
    const two = api.endpoints.getTodoById.select('2')(state)
    expect(one.isSuccess).toBe(true)
    expect(one.data).toEqual({ id: '1', title: 'one', completed: false })
    expect(two.isSuccess).toBe(true)
    expect(two.data).toEqual({ id: '2', title: 'two', completed: true })
  })

  test('upserted entries are served from cache without a fetch', async () => {
    const { api, store, baseQuery } = setup()

    await store.dispatch(api.endpoints.getTodos.initiate())
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const result = await store.dispatch(api.endpoints.getTodoById.initiate('1'))
    expect(result.data).toEqual({ id: '1', title: 'one', completed: false })
    // Cache hit: no additional network call for the byId endpoint
    expect(baseQuery).toHaveBeenCalledTimes(1)
  })

  test('refetching the source query updates upserted entries', async () => {
    const { api, store, todos } = setup()

    const sub = store.dispatch(api.endpoints.getTodos.initiate())
    await sub

    // Server-side change, then refetch the list
    todos[0] = { ...todos[0], completed: true }
    await sub.refetch()

    const one = api.endpoints.getTodoById.select('1')(store.getState())
    expect(one.data).toEqual({ id: '1', title: 'one', completed: true })

    sub.unsubscribe()
  })

  test('upsert works on endpoints injected at runtime', async () => {
    const { api, store, baseQuery } = setup()

    const extended = api.injectEndpoints({
      endpoints: {
        searchTodos: {
          kind: api.query.fn<Todo[], string>({
            queryFn: async (term) => ({
              data: [{ id: `search-${term}`, title: term, completed: false }],
            }),
          }),
          upsert: (result) =>
            result.map((todo) => ({
              endpoint: 'getTodoById' as const,
              arg: todo.id,
              value: todo,
            })),
        },
      },
    })

    await store.dispatch(extended.endpoints.searchTodos.initiate('milk'))

    const seeded = extended.endpoints.getTodoById.select('search-milk')(
      store.getState(),
    )
    expect(seeded.isSuccess).toBe(true)
    expect(seeded.data).toEqual({
      id: 'search-milk',
      title: 'milk',
      completed: false,
    })
    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('queries without an upsert option are unaffected', async () => {
    const { api, store, baseQuery } = setup()

    // byId has no upsert; fetching it should not touch other entries
    await store.dispatch(api.endpoints.getTodoById.initiate('2'))
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const list = api.endpoints.getTodos.select()(store.getState())
    expect(list.isUninitialized).toBe(true)
  })
})
