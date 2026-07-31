// PROBE: Ben's callback form — `endpoints: (build) => ({ ... })`.
// Question: can Defs be reverse-map inferred from the CALLBACK RETURN,
// with the upsert shell typed against the whole map?
// The 2025-01 failure was about getting Defs INTO build's methods (impossible);
// this only needs Defs at the return literal, and build only needs BQ/Tag/RP
// (which callback contextual typing provides, same mechanism as 2.x).
// prettier-ignore
/* eslint-disable */
import type { ApiBuilder, ApiV3, DefsShape, EndpointCells } from '../../src/query/v3'
import type { BaseQueryFn } from '../../src/query'
import { fetchBaseQuery } from '../../src/query'

declare function createApiCb<
  BQ extends BaseQueryFn,
  Defs extends DefsShape,
  RP extends string = 'api',
  const Tag extends string = never,
>(options: {
  baseQuery: BQ
  tagTypes?: readonly Tag[]
  reducerPath?: RP
  endpoints: (build: ApiBuilder<BQ, Tag, RP>) => EndpointCells<Defs>
}): ApiV3<BQ, Defs, RP, Tag>

interface Todo {
  id: string
  title: string
  completed: boolean
}
interface TodoListResponse {
  todos: Todo[]
  total: number
}

const api = createApiCb({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  reducerPath: 'cbApi',
  endpoints: (build) => ({
    // bare form
    getTodoById: build.query<Todo, string>({
      request: (id) => `/todos/${id}`,
      providesTags: (result, error, id) => [{ type: 'Todo' as const, id }],
    }),
    // shell form with cross-endpoint upsert
    getTodos: {
      kind: build.query<Todo[], void, TodoListResponse>({
        request: () => '/todos',
        transformResponse: (raw) => raw.todos,
      }),
      // NOTE: the param annotation is REQUIRED in callback form — an
      // unannotated arrow is context-sensitive and collapses Defs inference
      // through the callback return (see callback-minimal-probe cases 8/10).
      upsert: (todos: Todo[]) =>
        todos.map((t) => ({
          endpoint: 'getTodoById' as const,
          arg: t.id,
          value: t,
        })),
    },
    // body inference without explicit generics
    getTitle: build.query({
      request: (id: string) => `/todos/${id}`,
      transformResponse: (raw: Todo) => raw.title,
    }),
    updateTodo: build.mutation<Todo, { id: string } & Partial<Todo>>({
      request: (patch) => ({
        url: `/todos/${patch.id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['Todo'],
    }),
  }),
})

// ---- positive assertions (assignment-compatibility checks) ----
type Defs = (typeof api)['$types']['defs']
const argCheck: Defs['getTodoById']['arg'] extends string ? true : false = true
const resCheck: Defs['getTodoById']['result'] extends Todo ? true : false = true
const titleCheck: Defs['getTitle']['result'] extends string ? true : false =
  true
const titleArgCheck: Defs['getTitle']['arg'] extends string ? true : false =
  true
const listCheck: Defs['getTodos']['result'] extends Todo[] ? true : false = true
const mutCheck: Defs['updateTodo']['result'] extends Todo ? true : false = true

// endpoint surface typed
const sel = api.endpoints.getTodoById.select('1')
const ini = api.endpoints.getTodos.initiate
void sel
void ini
void argCheck
void resCheck
void titleCheck
void titleArgCheck
void listCheck
void mutCheck

// ---- negatives ----
const bad1 = createApiCb({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodoById: build.query<Todo, string>({
      request: (id) => `/todos/${id}`,
    }),
    getTodos: {
      kind: build.query<Todo[], void>({ request: () => '/todos' }),
      // @ts-expect-error wrong upsert value type (number is not Todo)
      upsert: (todos: Todo[]) =>
        todos.map((t) => ({
          endpoint: 'getTodoById' as const,
          arg: t.id,
          value: 42,
        })),
    },
  }),
})
void bad1

const bad2 = createApiCb({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodoById: build.query<Todo, string>({
      request: (id) => `/todos/${id}`,
      // @ts-expect-error tag not in tagTypes
      providesTags: ['Twdo'],
    }),
  }),
})
void bad2
