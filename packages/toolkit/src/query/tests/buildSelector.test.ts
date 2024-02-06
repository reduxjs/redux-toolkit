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
      getTodos: build.query<Todos, string>({
        query: () => '/todos',
      }),
    }),
  })

  const store = setupApiStore(exampleApi)
  it('should memoize selector creation', () => {
    expect(exampleApi.endpoints.getTodos.select('1')).toBe(
      exampleApi.endpoints.getTodos.select('1'),
    )

    expect(exampleApi.endpoints.getTodos.select('1')).not.toBe(
      exampleApi.endpoints.getTodos.select('2'),
    )

    expect(
      exampleApi.endpoints.getTodos.select('1')(store.store.getState()),
    ).toBe(exampleApi.endpoints.getTodos.select('1')(store.store.getState()))
  })
  it('exposes memoize methods on select', () => {
    expect(exampleApi.endpoints.getTodos.select.resultsCount).toBeTypeOf(
      'function',
    )
    expect(exampleApi.endpoints.getTodos.select.resetResultsCount).toBeTypeOf(
      'function',
    )
    expect(exampleApi.endpoints.getTodos.select.clearCache).toBeTypeOf(
      'function',
    )

    const firstResult = exampleApi.endpoints.getTodos.select('1')

    exampleApi.endpoints.getTodos.select.clearCache()

    const secondResult = exampleApi.endpoints.getTodos.select('1')

    expect(firstResult).not.toBe(secondResult)

    expect(firstResult(store.store.getState())).not.toBe(
      secondResult(store.store.getState()),
    )
  })
})
