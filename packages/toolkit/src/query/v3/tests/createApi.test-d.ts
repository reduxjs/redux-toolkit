/**
 * RTK Query v3 prototype: type-level tests for the builder-based `createApi`.
 *
 * These mirror the spike checklist (D:/Projects/redux/temp/rtk3-spikes) but
 * run against the real RTKQ type surface: real `fetchBaseQuery`, real
 * `QueryDefinition`/`MutationDefinition`/`InfiniteQueryDefinition`, real core
 * api surface via `ApiModules[coreModuleName]`.
 */
import { configureStore } from '@reduxjs/toolkit'
import { describe, expectTypeOf, test } from 'vitest'
import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@internal/query/fetchBaseQuery'
import { fetchBaseQuery } from '@internal/query/fetchBaseQuery'
import { createApiBuilder } from '@internal/query/v3/index'

interface Todo {
  id: string
  title: string
  completed: boolean
}

interface User {
  id: number
  name: string
}

interface TodoListResponse {
  todos: Todo[]
  total: number
}

interface PokemonPage {
  results: { name: string }[]
}

const build = createApiBuilder({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  reducerPath: 'v3Api',
  tagTypes: ['Todo', 'User'],
})

const api = build.createApi({
  endpoints: {
    getTodoById: {
      kind: build.query<Todo, string>({
        request: (id) => {
          expectTypeOf(id).toEqualTypeOf<string>()
          return `/todos/${id}`
        },
        providesTags: (result, error, id) => {
          expectTypeOf(result).toEqualTypeOf<Todo | undefined>()
          expectTypeOf(error).toEqualTypeOf<FetchBaseQueryError | undefined>()
          expectTypeOf(id).toEqualTypeOf<string>()
          return [{ type: 'Todo' as const, id }]
        },
      }),
    },
    getTodos: {
      // Third generic = raw (pre-transformResponse) response type
      kind: build.query<Todo[], void, TodoListResponse>({
        request: () => '/todos',
        transformResponse: (raw, meta, arg) => {
          expectTypeOf(raw).toEqualTypeOf<TodoListResponse>()
          expectTypeOf(meta).toEqualTypeOf<FetchBaseQueryMeta | undefined>()
          expectTypeOf(arg).toEqualTypeOf<void>()
          return raw.todos
        },
        providesTags: ['Todo'],
        onQueryStarted: async (arg, { queryFulfilled, dispatch, getState }) => {
          expectTypeOf(arg).toEqualTypeOf<void>()
          const { data, meta } = await queryFulfilled
          expectTypeOf(data).toEqualTypeOf<Todo[]>()
          expectTypeOf(meta).toEqualTypeOf<FetchBaseQueryMeta | undefined>()
          queryFulfilled.catch((reason) => {
            expectTypeOf(reason.isUnhandledError).toEqualTypeOf<boolean>()
          })
        },
      }),
      // The typed cross-endpoint upsert option lives in the cell shell (next
      // to `kind`): `arg`/`value` narrow from the `endpoint` discriminant.
      upsert: (todos, arg) => {
        expectTypeOf(todos).toEqualTypeOf<Todo[]>()
        expectTypeOf(arg).toEqualTypeOf<void>()
        return todos.map((t) => ({
          endpoint: 'getTodoById' as const,
          arg: t.id,
          value: t,
        }))
      },
    },
    getSession: {
      // queryFn flavor: uses the dedicated `query.fn` creator
      kind: build.query.fn<User, void>({
        queryFn: async (arg, queryApi, extraOptions, baseQuery) => {
          expectTypeOf(arg).toEqualTypeOf<void>()
          const res = await baseQuery('/session')
          expectTypeOf(res.error).toEqualTypeOf<
            FetchBaseQueryError | undefined
          >()
          if (res.error) {
            return { error: res.error }
          }
          return { data: res.data as User }
        },
      }),
    },
    updateTodo: {
      kind: build.mutation<Todo, { id: string } & Partial<Todo>>({
        request: (patch) => {
          expectTypeOf(patch.id).toEqualTypeOf<string>()
          return { url: `/todos/${patch.id}`, method: 'PATCH', body: patch }
        },
        invalidatesTags: (result, error, arg) => {
          expectTypeOf(result).toEqualTypeOf<Todo | undefined>()
          return [{ type: 'Todo' as const, id: arg.id }]
        },
      }),
    },
    getPokemon: {
      kind: build.infiniteQuery<PokemonPage, string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            expectTypeOf(lastPage).toEqualTypeOf<PokemonPage>()
            expectTypeOf(allPages).toEqualTypeOf<PokemonPage[]>()
            expectTypeOf(lastPageParam).toEqualTypeOf<number>()
            return lastPageParam + 1
          },
        },
        request: ({ queryArg, pageParam }) => {
          expectTypeOf(queryArg).toEqualTypeOf<string>()
          expectTypeOf(pageParam).toEqualTypeOf<number>()
          return `/pokemon/${queryArg}?page=${pageParam}`
        },
      }),
    },
  },
})

describe('v3 createApi type inference', () => {
  test('$types bag carries the inferred type parameters', () => {
    expectTypeOf(api.$types.reducerPath).toEqualTypeOf<'v3Api'>()
    expectTypeOf(api.$types.tagTypes).toEqualTypeOf<'Todo' | 'User'>()
    expectTypeOf(api.$types.baseQuery).toEqualTypeOf<
      ReturnType<typeof fetchBaseQuery>
    >()
    expectTypeOf(api.$types.defs.getTodos.result).toEqualTypeOf<Todo[]>()
    expectTypeOf(api.$types.defs.getTodoById.arg).toEqualTypeOf<string>()
    expectTypeOf(api.$types.defs).toHaveProperty('updateTodo')
    expectTypeOf(api.$types.defs).toHaveProperty('getPokemon')
  })

  test('body inference without explicit generics (restored 2.x paths)', () => {
    // Arg from an annotated `request` parameter; Result from the
    // `transformResponse` return type; Raw from the annotated
    // `transformResponse` parameter.
    const stamp = build.query({
      request: (id: string) => `/todos/${id}`,
      transformResponse: (raw: TodoListResponse) => raw.todos,
    })
    expectTypeOf(stamp.$meta.arg).toEqualTypeOf<string>()
    expectTypeOf(stamp.$meta.result).toEqualTypeOf<Todo[]>()
    expectTypeOf(stamp.$meta.raw).toEqualTypeOf<TodoListResponse>()
  })

  test('core endpoint surface is fully typed', () => {
    expectTypeOf(api.reducerPath).toEqualTypeOf<'v3Api'>()

    expectTypeOf(api.endpoints.getTodoById.initiate)
      .parameter(0)
      .toEqualTypeOf<string>()

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    const selected = api.endpoints.getTodoById.select('1')(store.getState())
    expectTypeOf(selected.data).toEqualTypeOf<Todo | undefined>()

    const todosSelected = api.endpoints.getTodos.select()(store.getState())
    expectTypeOf(todosSelected.data).toEqualTypeOf<Todo[] | undefined>()

    expectTypeOf(api.endpoints.updateTodo.initiate)
      .parameter(0)
      .toEqualTypeOf<{ id: string } & Partial<Todo>>()

    expectTypeOf(api.util.invalidateTags).toBeCallableWith([
      'Todo',
      { type: 'User', id: 1 },
    ])
    // @ts-expect-error tag name outside the declared tagTypes
    api.util.invalidateTags(['Nope'])
  })

  test('injectEndpoints extends defs and can upsert-target original endpoints', () => {
    const extended = api.injectEndpoints({
      endpoints: {
        getUser: {
          kind: build.query<User, number>({
            request: (id) => `/users/${id}`,
            providesTags: (result, error, id) => [
              { type: 'User' as const, id },
            ],
          }),
          // upsert targets include endpoints from the *original* api
          upsert: (user) => [
            { endpoint: 'getSession' as const, arg: undefined, value: user },
          ],
        },
      },
    })

    expectTypeOf(extended.endpoints.getUser.initiate)
      .parameter(0)
      .toEqualTypeOf<number>()
    // Original endpoints still present
    expectTypeOf(extended.endpoints.getTodoById.initiate)
      .parameter(0)
      .toEqualTypeOf<string>()
    expectTypeOf(extended.$types.defs).toHaveProperty('getUser')
    expectTypeOf(extended.$types.defs).toHaveProperty('getTodos')
  })
})

describe('v3 createApi negative cases', () => {
  test('wrong tag types are rejected', () => {
    const b = createApiBuilder({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
      tagTypes: ['Todo'],
    })
    b.query<Todo[], void>({
      request: () => '/todos',
      // @ts-expect-error typo'd tag name is not assignable
      providesTags: ['Twdo'],
    })
  })

  test('query return type is validated against the base query arg type', () => {
    const b = createApiBuilder({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    })
    b.query<Todo[], void>({
      // @ts-expect-error 42 is not string | FetchArgs
      request: () => 42,
    })
  })

  test('upsert descriptors are validated against the target endpoint', () => {
    const b = createApiBuilder({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    })
    b.createApi({
      endpoints: {
        getTodoById: {
          kind: b.query<Todo, string>({
            request: (id) => `/todos/${id}`,
          }),
        },
        getTodos: {
          kind: b.query<Todo[], void>({
            request: () => '/todos',
          }),
          // @ts-expect-error value must be a Todo, not a string
          upsert: (todos) =>
            todos.map((t) => ({
              endpoint: 'getTodoById' as const,
              arg: t.id,
              value: t.title,
            })),
        },
      },
    })

    b.createApi({
      endpoints: {
        getTodoById: {
          kind: b.query<Todo, string>({
            request: (id) => `/todos/${id}`,
          }),
        },
        getTodos: {
          kind: b.query<Todo[], void>({
            request: () => '/todos',
          }),
          // @ts-expect-error nonexistent endpoint name
          upsert: (todos) =>
            todos.map((t) => ({
              endpoint: 'getTodoByIdd' as const,
              arg: t.id,
              value: t,
            })),
        },
      },
    })
  })

  test('transformResponse return must match the declared result type', () => {
    const b = createApiBuilder({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    })
    b.query<Todo[], void, TodoListResponse>({
      request: () => '/todos',
      // @ts-expect-error returns the wrong type
      transformResponse: (raw) => raw.total,
    })
  })
})

describe('v3 enhanceEndpoints types', () => {
  test('partial cell merge is typed against the endpoint definition', () => {
    api.enhanceEndpoints({
      endpoints: {
        getTodoById: {
          providesTags: (result, error, id) => {
            expectTypeOf(result).toEqualTypeOf<Todo | undefined>()
            expectTypeOf(id).toEqualTypeOf<string>()
            return [{ type: 'Todo' as const, id }]
          },
        },
      },
    })

    api.enhanceEndpoints({
      endpoints: {
        getTodoById: {
          // @ts-expect-error unknown tag type
          providesTags: ['Nope'],
        },
      },
    })
  })

  test('recipe form receives the typed definition', () => {
    api.enhanceEndpoints({
      endpoints: {
        getTodoById: (definition) => {
          definition.transformResponse = (raw, meta, arg) => {
            expectTypeOf(meta).toEqualTypeOf<
              FetchBaseQueryMeta | undefined
            >()
            expectTypeOf(arg).toEqualTypeOf<string>()
            return raw as Todo
          }
        },
      },
    })
  })

  test('addTagTypes widens the returned api tag union, not the original', () => {
    const enhanced = api.enhanceEndpoints({
      addTagTypes: ['Stats'] as const,
      endpoints: {
        getTodos: {
          providesTags: ['Stats'],
        },
      },
    })

    // the enhanced api accepts the new tag in later enhancements
    enhanced.enhanceEndpoints({
      endpoints: {
        getTodoById: {
          providesTags: ['Stats'],
        },
      },
    })

    enhanced.util.invalidateTags(['Stats'])

    api.enhanceEndpoints({
      endpoints: {
        getTodoById: {
          // @ts-expect-error original api does not know the new tag
          providesTags: ['Stats'],
        },
      },
    })

    // @ts-expect-error original api util does not know the new tag
    api.util.invalidateTags(['Stats'])
  })
})
