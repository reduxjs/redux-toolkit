import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { configureStore, createSelector } from '@reduxjs/toolkit'

describe('type tests', () => {
  test('buildSelector type test', () => {
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

    const exampleQuerySelector = exampleApi.endpoints.getTodos.select('/')

    const todosSelector = createSelector(
      [exampleQuerySelector],
      (queryState) => {
        return queryState?.data?.[0] ?? ({} as Todo)
      },
    )

    const firstTodoTitleSelector = createSelector(
      [todosSelector],
      (todo) => todo?.title,
    )

    const store = configureStore({
      reducer: {
        [exampleApi.reducerPath]: exampleApi.reducer,
        other: () => 1,
      },
    })

    const todoTitle = firstTodoTitleSelector(store.getState())

    // This only compiles if we carried the types through
    const upperTitle = todoTitle.toUpperCase()

    expectTypeOf(upperTitle).toBeString()
  })

  test('selectCachedArgsForQuery type test', () => {
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

    const store = configureStore({
      reducer: {
        [exampleApi.reducerPath]: exampleApi.reducer,
        other: () => 1,
      },
    })

    expectTypeOf(
      exampleApi.util.selectCachedArgsForQuery(store.getState(), 'getTodos'),
    ).toEqualTypeOf<string[]>()
  })
})
