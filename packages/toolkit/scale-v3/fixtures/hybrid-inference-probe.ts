// Probe: do bound creators restore the 2.x no-generics inference paths?
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
    // Path A: Arg inferred from annotated request callback param, no generics
    byId: {
      kind: c.query({
        request: (id: string) => `/todos/${id}`,
        transformResponse: (raw: { data: Todo }) => raw.data,
      }),
    },
  },
})

// Path B assertions: Result inferred from transformResponse return
const sel = api.endpoints.byId.select
type SelectedData = NonNullable<
  ReturnType<ReturnType<typeof sel>>['data']
>
const dataCheck: SelectedData = { id: 'x', title: 'y' } // must be Todo
// Arg check: initiate must take string
const ini = api.endpoints.byId.initiate
ini('abc')
// @ts-expect-error initiate arg must be string
ini(42)
// @ts-expect-error data must be Todo, not number
const dataCheckBad: SelectedData = 42

export { api, dataCheck }
