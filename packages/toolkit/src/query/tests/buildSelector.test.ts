import {
  buildCreateApi,
  coreModule,
  createApi,
  fetchBaseQuery,
  reactHooksModule,
} from '@reduxjs/toolkit/query/react'
import { setupApiStore } from '../../tests/utils/helpers'
import {
  createSelectorCreator,
  lruMemoize,
  type weakMapMemoize,
} from 'reselect'
import { assertCast } from '../tsHelpers'

describe('buildSelector', () => {
  interface Todo {
    userId: number
    id: number
    title: string
    completed: boolean
  }

  type Todos = Array<Todo>

  const exampleApi = createApi({
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
  it('exposes memoize methods on select (untyped)', () => {
    assertCast<
      typeof exampleApi.endpoints.getTodo.select &
        Omit<ReturnType<typeof weakMapMemoize>, ''>
    >(exampleApi.endpoints.getTodo.select)

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
  it('uses createSelector instance memoize', () => {
    const createLruSelector = createSelectorCreator(lruMemoize)
    const createApi = buildCreateApi(
      coreModule({ createSelector: createLruSelector }),
      reactHooksModule({ createSelector: createLruSelector }),
    )

    const exampleLruApi = createApi({
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

    expect(exampleLruApi.endpoints.getTodo.select('1')).toBe(
      exampleLruApi.endpoints.getTodo.select('1'),
    )

    expect(exampleLruApi.endpoints.getTodo.select('1')).not.toBe(
      exampleLruApi.endpoints.getTodo.select('2'),
    )

    const firstResult = exampleLruApi.endpoints.getTodo.select('1')

    const secondResult = exampleLruApi.endpoints.getTodo.select('2')

    const thirdResult = exampleLruApi.endpoints.getTodo.select('1')

    // cache size of 1
    expect(firstResult).not.toBe(thirdResult)
  })
})
