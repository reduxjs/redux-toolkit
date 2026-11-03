import { configureStore, createSelector } from '@reduxjs/toolkit'
import type {
  InfiniteData,
  QueryCacheEntry,
  QueryCacheKey,
} from '@reduxjs/toolkit/query/react'
import {
  createApi,
  fetchBaseQuery,
  QueryStatus,
} from '@reduxjs/toolkit/query/react'

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
        getInfiniteTodos: build.infiniteQuery<Todos, string, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            maxPages: 3,
            getNextPageParam: (
              lastPage,
              allPages,
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
          },
          query({ pageParam }) {
            return `/todos?page=${pageParam}`
          },
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
    expectTypeOf(
      exampleApi.util.selectCachedArgsForQuery(
        store.getState(),
        'getInfiniteTodos',
      ),
    ).toEqualTypeOf<string[]>()
  })

  test('selectEntriesForEndpoint and selectAllQueryEntries type test', () => {
    interface Todo {
      id: number
      title: string
    }

    const exampleApi = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
      endpoints: (build) => ({
        getTodos: build.query<Todo[], string>({
          query: () => '/todos',
        }),
        getInfiniteTodos: build.infiniteQuery<Todo[], string, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (lastPage, allPages, lastPageParam) =>
              lastPageParam + 1,
          },
          query: ({ pageParam }) => `/todos?page=${pageParam}`,
        }),
        addTodo: build.mutation<Todo, Partial<Todo>>({
          query: (body) => ({ url: '/todos', method: 'POST', body }),
        }),
      }),
    })

    const store = configureStore({
      reducer: { [exampleApi.reducerPath]: exampleApi.reducer },
    })
    const state = store.getState()

    const todoEntries = exampleApi.util.selectEntriesForEndpoint(
      state,
      'getTodos',
    )
    expectTypeOf(todoEntries).toEqualTypeOf<
      QueryCacheEntry<
        typeof exampleApi.endpoints.getTodos.Types.QueryDefinition
      >[]
    >()

    const [todoEntry] = todoEntries
    expectTypeOf(todoEntry.queryCacheKey).toEqualTypeOf<QueryCacheKey>()
    expectTypeOf(todoEntry.originalArgs).toEqualTypeOf<string>()
    expectTypeOf(todoEntry.data).toEqualTypeOf<Todo[] | undefined>()
    expectTypeOf(todoEntry.status).toEqualTypeOf<
      QueryStatus.pending | QueryStatus.fulfilled | QueryStatus.rejected
    >()
    if (todoEntry.status === QueryStatus.fulfilled) {
      expectTypeOf(todoEntry.data).toEqualTypeOf<Todo[]>()
    }

    const [infiniteEntry] = exampleApi.util.selectEntriesForEndpoint(
      state,
      'getInfiniteTodos',
    )
    expectTypeOf(infiniteEntry.data).toEqualTypeOf<
      InfiniteData<Todo[], number> | undefined
    >()

    // @ts-expect-error mutations have no query cache entries
    exampleApi.util.selectEntriesForEndpoint(state, 'addTodo')

    // @ts-expect-error unknown endpoint
    exampleApi.util.selectEntriesForEndpoint(state, 'nope')

    const [anyEntry] = exampleApi.util.selectAllQueryEntries(state)
    expectTypeOf(anyEntry.queryCacheKey).toEqualTypeOf<QueryCacheKey>()
    expectTypeOf(anyEntry.endpointName).toBeString()
    expectTypeOf(anyEntry.data).toEqualTypeOf<
      Todo[] | InfiniteData<Todo[], number> | undefined
    >()
  })
})
