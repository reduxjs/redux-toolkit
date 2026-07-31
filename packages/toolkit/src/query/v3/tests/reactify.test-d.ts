/**
 * RTK Query v3 prototype: type-level tests for `reactify`.
 */
import { fetchBaseQuery } from '@internal/query/fetchBaseQuery'
import { createApi, mutation, query } from '@internal/query/v3/index'
import { reactify } from '@internal/query/v3/react'
import { describe, expectTypeOf, test } from 'vitest'

interface Todo {
  id: string
  title: string
  completed: boolean
}

interface User {
  id: number
  name: string
}

const coreApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  reducerPath: 'v3Api',
  tagTypes: ['Todo'],
  endpoints: {
    getTodoById: {
      kind: query<Todo, string>(),
      request: (id) => `/todos/${id}`,
    },
    getTodos: {
      kind: query<Todo[], void>(),
      request: () => '/todos',
    },
    updateTodo: {
      kind: mutation<Todo, { id: string } & Partial<Todo>>(),
      request: (patch) => ({ url: `/todos/${patch.id}`, body: patch }),
    },
  },
})

const api = reactify(coreApi)

describe('reactify types', () => {
  test('generates uniquely-named hooks with carried-through types', () => {
    const queryResult = api.useGetTodoByIdQuery('1')
    expectTypeOf(queryResult.data).toEqualTypeOf<Todo | undefined>()
    expectTypeOf(queryResult.isLoading).toEqualTypeOf<boolean>()

    // @ts-expect-error arg must be a string
    api.useGetTodoByIdQuery(42)

    const [trigger, mutationResult] = api.useUpdateTodoMutation()
    expectTypeOf(trigger).parameter(0).toEqualTypeOf<
      { id: string } & Partial<Todo>
    >()
    expectTypeOf(mutationResult.data).toEqualTypeOf<Todo | undefined>()

    const lazy = api.useLazyGetTodosQuery()
    expectTypeOf(lazy[1].data).toEqualTypeOf<Todo[] | undefined>()
  })

  test('per-endpoint hooks and usePrefetch exist', () => {
    const result = api.endpoints.getTodos.useQuery()
    expectTypeOf(result.data).toEqualTypeOf<Todo[] | undefined>()

    // Core surface is still present on the same object
    expectTypeOf(api.endpoints.getTodos.initiate).toBeFunction()
    expectTypeOf(api.reducerPath).toEqualTypeOf<'v3Api'>()

    const prefetch = api.usePrefetch('getTodoById')
    expectTypeOf(prefetch).parameter(0).toEqualTypeOf<string>()

    // @ts-expect-error mutations cannot be prefetched
    api.usePrefetch('updateTodo')
  })

  test('$types survives reactification', () => {
    expectTypeOf(api.$types.reducerPath).toEqualTypeOf<'v3Api'>()
    expectTypeOf(api.$types.defs.getTodoById.arg).toEqualTypeOf<string>()
  })

  test('the core api type does not expose hooks', () => {
    // @ts-expect-error hooks only exist on the reactified type
    coreApi.useGetTodoByIdQuery
    // @ts-expect-error per-endpoint hooks only exist on the reactified type
    coreApi.endpoints.getTodoById.useQuery
  })

  test('injectEndpoints after reactify generates hooks for new endpoints', () => {
    const extended = api.injectEndpoints({
      endpoints: {
        getUser: {
          kind: query<User, number>(),
          request: (id) => `/users/${id}`,
        },
      },
    })

    const userResult = extended.useGetUserQuery(1)
    expectTypeOf(userResult.data).toEqualTypeOf<User | undefined>()

    // Pre-existing hooks are preserved
    const todoResult = extended.useGetTodoByIdQuery('1')
    expectTypeOf(todoResult.data).toEqualTypeOf<Todo | undefined>()

    expectTypeOf(extended.$types.defs).toHaveProperty('getUser')
  })

  test('inject on a non-reactified api does not produce hooks', () => {
    const extendedCore = coreApi.injectEndpoints({
      endpoints: {
        getUser: {
          kind: query<User, number>(),
          request: (id) => `/users/${id}`,
        },
      },
    })
    expectTypeOf(extendedCore.endpoints.getUser.initiate)
      .parameter(0)
      .toEqualTypeOf<number>()
    // @ts-expect-error no hooks on the core api type
    extendedCore.useGetUserQuery
  })
})
