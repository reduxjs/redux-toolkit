// Negative probe: verifies the hybrid encoding actually checks types.
// Every @ts-expect-error below must fire (tsc reports unused directives).
/* eslint-disable */
import { fetchBaseQuery } from '../../src/query'
import { boundCreators, createApiHybrid } from './hybrid-support'

interface Todo { id: string; title: string }

const c = boundCreators(fetchBaseQuery({ baseUrl: '/api' }), {
  tagTypes: ['Todo'] as const,
})

const api = createApiHybrid({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'] as const,
  endpoints: {
    getTodo: {
      kind: c.query<Todo, string>({
        request: (id) => `/todos/${id}`,
        // @ts-expect-error wrong tag name must be rejected
        providesTags: ['Twdo'],
      }),
    },
    getTodos: {
      kind: c.query<Todo[], void>({
        request: () => '/todos',
        // @ts-expect-error request must return string | FetchArgs
        transformResponse: (raw): number => 42,
      }),
      // @ts-expect-error wrong endpoint name must be rejected
      upsert: (todos) =>
        todos.map((t) => ({
          endpoint: 'getTodoX' as const,
          arg: t.id,
          value: t,
        })),
    },
    badUpsert: {
      kind: c.query<Todo[], void>({ request: () => '/todos' }),
      // @ts-expect-error wrong value type for getTodo must be rejected
      upsert: (todos) =>
        todos.map((t) => ({
          endpoint: 'getTodo' as const,
          arg: t.id,
          value: 42,
        })),
    },
  },
})

// positive: contextual typing works — upsert result param is Todo[]
const api2 = createApiHybrid({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: {
    a: { kind: c.query<Todo, string>({ request: (id) => `/t/${id}` }) },
    b: {
      kind: c.query<Todo[], void>({ request: () => '/t' }),
      upsert: (todos) =>
        todos.map((t) => ({ endpoint: 'a' as const, arg: t.id, value: t })),
    },
  },
})
const sel = api2.endpoints.a.select
export { api, api2, sel }
