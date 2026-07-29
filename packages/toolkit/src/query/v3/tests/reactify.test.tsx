/**
 * RTK Query v3 prototype: runtime tests for `reactify` — the React hooks
 * layer attached to a core api instance as a plain function call.
 */
import { configureStore } from '@reduxjs/toolkit'
import { createApi, query, mutation } from '@internal/query/v3/index'
import { reactify } from '@internal/query/v3/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'
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

  const baseQuery = vi.fn(
    async (arg: string | { url: string; method?: string; body?: any }) => {
      const url = typeof arg === 'string' ? arg : arg.url
      if (url === '/todos') {
        return { data: todos.map((t) => ({ ...t })) }
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
  )

  const coreApi = createApi({
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
        ...query<Todo[], void>(),
        query: () => '/todos',
        providesTags: ['Todo'],
      },
      updateTodo: {
        ...mutation<Todo, { id: string } & Partial<Todo>>(),
        query: ({ id, ...patch }) => ({
          url: `/todos/${id}`,
          method: 'PATCH',
          body: patch,
        }),
        invalidatesTags: ['Todo'],
      },
    },
  })

  const api = reactify(coreApi)

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  return { api, coreApi, store, baseQuery, wrapper }
}

describe('reactify runtime', () => {
  test('attaches generated hooks to the api instance', () => {
    const { api } = setup()
    expect(typeof api.useGetTodoByIdQuery).toBe('function')
    expect(typeof api.useLazyGetTodoByIdQuery).toBe('function')
    expect(typeof api.useGetTodosQuery).toBe('function')
    expect(typeof api.useUpdateTodoMutation).toBe('function')
    expect(typeof api.usePrefetch).toBe('function')
    expect(typeof api.endpoints.getTodos.useQuery).toBe('function')
    expect(typeof api.endpoints.updateTodo.useMutation).toBe('function')
  })

  test('useQuery hook fetches and reports flags', async () => {
    const { api, wrapper, baseQuery } = setup()

    const { result } = renderHook(() => api.useGetTodoByIdQuery('1'), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      id: '1',
      title: 'one',
      completed: false,
    })
    expect(result.current.isFetching).toBe(false)
    expect(baseQuery).toHaveBeenCalledTimes(1)
  })

  test('mutation hook triggers and invalidation refetches active queries', async () => {
    const { api, wrapper, baseQuery } = setup()

    const { result } = renderHook(
      () => {
        const todos = api.useGetTodosQuery()
        const [updateTodo, mutationState] = api.useUpdateTodoMutation()
        return { todos, updateTodo, mutationState }
      },
      { wrapper },
    )

    await waitFor(() => expect(result.current.todos.isSuccess).toBe(true))
    expect(baseQuery).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateTodo({ id: '1', completed: true })
    })

    await waitFor(() =>
      expect(result.current.mutationState.isSuccess).toBe(true),
    )

    // Tag invalidation refetches the subscribed getTodos query
    await waitFor(() =>
      expect(
        result.current.todos.data?.find((t) => t.id === '1')?.completed,
      ).toBe(true),
    )
    // initial fetch + mutation + refetch
    expect(baseQuery).toHaveBeenCalledTimes(3)
  })

  test('hooks work for endpoints injected after reactification', async () => {
    const { api, wrapper } = setup()

    const extended = api.injectEndpoints({
      endpoints: {
        getGreeting: {
          ...query<string, string>(),
          queryFn: async (name) => ({ data: `hello ${name}` }),
        },
      },
    })

    const { result } = renderHook(() => extended.useGetGreetingQuery('mark'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('hello mark')

    // Hooks for original endpoints still work on the extended reference
    const { result: todoResult } = renderHook(
      () => extended.useGetTodoByIdQuery('2'),
      { wrapper },
    )
    await waitFor(() => expect(todoResult.current.isSuccess).toBe(true))
    expect(todoResult.current.data).toEqual({
      id: '2',
      title: 'two',
      completed: true,
    })
  })

  test('endpoints injected before reactification get hooks via replay', async () => {
    const coreApi = createApi({
      baseQuery: async (arg: string) => ({ data: `fetched:${arg}` }),
      reducerPath: 'replayApi',
      endpoints: {
        getA: {
          ...query<string, string>(),
          query: (arg) => arg,
        },
      },
    })

    // Inject BEFORE reactify — reactify must replay existing endpoints
    const extendedCore = coreApi.injectEndpoints({
      endpoints: {
        getB: {
          ...query<string, string>(),
          query: (arg) => `b/${arg}`,
        },
      },
    })

    const api = reactify(extendedCore)

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware),
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    expect(typeof api.useGetAQuery).toBe('function')
    expect(typeof api.useGetBQuery).toBe('function')

    const { result } = renderHook(() => api.useGetBQuery('x'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('fetched:b/x')
  })

  test('usePrefetch works on a reactified api', async () => {
    const { api, wrapper, baseQuery, store } = setup()

    const { result } = renderHook(() => api.usePrefetch('getTodoById'), {
      wrapper,
    })

    act(() => {
      result.current('2')
    })

    await waitFor(() => {
      const selected = api.endpoints.getTodoById.select('2')(store.getState())
      expect(selected.isSuccess).toBe(true)
    })
    expect(baseQuery).toHaveBeenCalledTimes(1)
  })
})
