// EXPERIMENT: bare-form cells (no { kind } wrapper), 12 endpoints, no upsert
// prettier-ignore
/* eslint-disable */
import { createApiBuilder } from '../../src/query/v3'
import { fetchBaseQuery } from '../../src/query'

interface Thing0 { id: string; name: string; score0: number }
interface Raw0 { data: Thing0[]; fetchedAt: number }
interface Thing1 { id: string; name: string; score1: number }
interface Raw1 { data: Thing1[]; fetchedAt: number }
interface Thing2 { id: string; name: string; score2: number }
interface Raw2 { data: Thing2[]; fetchedAt: number }
interface Thing3 { id: string; name: string; score3: number }
interface Raw3 { data: Thing3[]; fetchedAt: number }

const build = createApiBuilder({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['TagA', 'TagB', 'TagC', 'TagD', 'TagE'] as const,
  reducerPath: 'scaleApi',
})

const api = build.createApi({
  endpoints: {
    getThing0: build.query<Thing0, string>({
        request: (id) => `/thing0/${id}`,
        providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
      }),
    getThing0List: build.query<Thing0[], void, Raw0>({
        request: () => '/thing0',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
    updateThing0: build.mutation<Thing0, Partial<Thing0> & { id: string }>({
        request: (patch) => ({ url: `/thing0/${patch.id}`, method: 'PATCH', body: patch }),
        invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
      }),
    getThing1: build.query<Thing1, string>({
        request: (id) => `/thing1/${id}`,
        providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
      }),
    getThing1List: build.query<Thing1[], void, Raw1>({
        request: () => '/thing1',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
    updateThing1: build.mutation<Thing1, Partial<Thing1> & { id: string }>({
        request: (patch) => ({ url: `/thing1/${patch.id}`, method: 'PATCH', body: patch }),
        invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
      }),
    getThing2: build.query<Thing2, string>({
        request: (id) => `/thing2/${id}`,
        providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
      }),
    getThing2List: build.query<Thing2[], void, Raw2>({
        request: () => '/thing2',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
    updateThing2: build.mutation<Thing2, Partial<Thing2> & { id: string }>({
        request: (patch) => ({ url: `/thing2/${patch.id}`, method: 'PATCH', body: patch }),
        invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
      }),
    getThing3: build.query<Thing3, string>({
        request: (id) => `/thing3/${id}`,
        providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
      }),
    getThing3List: build.query<Thing3[], void, Raw3>({
        request: () => '/thing3',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
    updateThing3: build.mutation<Thing3, Partial<Thing3> & { id: string }>({
        request: (patch) => ({ url: `/thing3/${patch.id}`, method: 'PATCH', body: patch }),
        invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
      }),
  },
})

const ini0 = api.endpoints.getThing0.initiate
const sel0 = api.endpoints.getThing0List.select
const mut0 = api.endpoints.updateThing0.initiate
const ini1 = api.endpoints.getThing1.initiate
const sel1 = api.endpoints.getThing1List.select
const mut1 = api.endpoints.updateThing1.initiate
const ini2 = api.endpoints.getThing2.initiate
const sel2 = api.endpoints.getThing2List.select
const mut2 = api.endpoints.updateThing2.initiate
const ini3 = api.endpoints.getThing3.initiate
const sel3 = api.endpoints.getThing3List.select
const mut3 = api.endpoints.updateThing3.initiate

export { api }
