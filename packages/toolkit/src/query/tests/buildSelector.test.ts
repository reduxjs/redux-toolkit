import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setupApiStore } from '../../tests/utils/helpers'

describe('buildSelector', () => {
  interface Todo {
    userId: number
    id: number
    title: string
    completed: boolean
  }

  type Todos = Array<Todo>

  const exampleApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://jsonplaceholder.typicode.com',
    }),
    endpoints: (build) => ({
      getTodos: build.query<Todos, void>({
        query: () => '/todos',
      }),
      getTodo: build.query<Todo, string>({
        query: (id) => `/todos/${id}`,
      }),
    }),
  })

  const store = setupApiStore(exampleApi)
  it('should memoize selector creation', () => {
    expect(exampleApi.endpoints.getTodo.select('1')).toBe(
      exampleApi.endpoints.getTodo.select('1'),
    )

    expect(exampleApi.endpoints.getTodo.select('1')).not.toBe(
      exampleApi.endpoints.getTodo.select('2'),
    )

    expect(
      exampleApi.endpoints.getTodo.select('1')(store.store.getState()),
    ).toBe(exampleApi.endpoints.getTodo.select('1')(store.store.getState()))

    expect(exampleApi.endpoints.getTodos.select()).toBe(
      exampleApi.endpoints.getTodos.select(undefined),
    )
  })
  it('exposes memoize methods on select', () => {
    expect(exampleApi.endpoints.getTodo.select.resultsCount).toBeTypeOf(
      'function',
    )
    expect(exampleApi.endpoints.getTodo.select.resetResultsCount).toBeTypeOf(
      'function',
    )
    expect(exampleApi.endpoints.getTodo.select.clearCache).toBeTypeOf(
      'function',
    )

    const firstResult = exampleApi.endpoints.getTodo.select('1')

    exampleApi.endpoints.getTodo.select.clearCache()

    const secondResult = exampleApi.endpoints.getTodo.select('1')

    expect(firstResult).not.toBe(secondResult)

    expect(firstResult(store.store.getState())).not.toBe(
      secondResult(store.store.getState()),
    )
  })
})
