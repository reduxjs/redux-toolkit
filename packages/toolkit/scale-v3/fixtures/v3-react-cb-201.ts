// DERIVED from v3-cb-upsert-201 — v3 react entry, endpoints callback form (one call), 201 endpoints, with upsert, all hooks referenced
// prettier-ignore
/* eslint-disable */
import { createApi } from '../../src/query/v3/react'
import { fetchBaseQuery } from '../../src/query'

interface Thing0 { id: string; name: string; score0: number }
interface Raw0 { data: Thing0[]; fetchedAt: number }
interface Thing1 { id: string; name: string; score1: number }
interface Raw1 { data: Thing1[]; fetchedAt: number }
interface Thing2 { id: string; name: string; score2: number }
interface Raw2 { data: Thing2[]; fetchedAt: number }
interface Thing3 { id: string; name: string; score3: number }
interface Raw3 { data: Thing3[]; fetchedAt: number }
interface Thing4 { id: string; name: string; score4: number }
interface Raw4 { data: Thing4[]; fetchedAt: number }
interface Thing5 { id: string; name: string; score5: number }
interface Raw5 { data: Thing5[]; fetchedAt: number }
interface Thing6 { id: string; name: string; score6: number }
interface Raw6 { data: Thing6[]; fetchedAt: number }
interface Thing7 { id: string; name: string; score7: number }
interface Raw7 { data: Thing7[]; fetchedAt: number }
interface Thing8 { id: string; name: string; score8: number }
interface Raw8 { data: Thing8[]; fetchedAt: number }
interface Thing9 { id: string; name: string; score9: number }
interface Raw9 { data: Thing9[]; fetchedAt: number }
interface Thing10 { id: string; name: string; score10: number }
interface Raw10 { data: Thing10[]; fetchedAt: number }
interface Thing11 { id: string; name: string; score11: number }
interface Raw11 { data: Thing11[]; fetchedAt: number }
interface Thing12 { id: string; name: string; score12: number }
interface Raw12 { data: Thing12[]; fetchedAt: number }
interface Thing13 { id: string; name: string; score13: number }
interface Raw13 { data: Thing13[]; fetchedAt: number }
interface Thing14 { id: string; name: string; score14: number }
interface Raw14 { data: Thing14[]; fetchedAt: number }
interface Thing15 { id: string; name: string; score15: number }
interface Raw15 { data: Thing15[]; fetchedAt: number }
interface Thing16 { id: string; name: string; score16: number }
interface Raw16 { data: Thing16[]; fetchedAt: number }
interface Thing17 { id: string; name: string; score17: number }
interface Raw17 { data: Thing17[]; fetchedAt: number }
interface Thing18 { id: string; name: string; score18: number }
interface Raw18 { data: Thing18[]; fetchedAt: number }
interface Thing19 { id: string; name: string; score19: number }
interface Raw19 { data: Thing19[]; fetchedAt: number }
interface Thing20 { id: string; name: string; score20: number }
interface Raw20 { data: Thing20[]; fetchedAt: number }
interface Thing21 { id: string; name: string; score21: number }
interface Raw21 { data: Thing21[]; fetchedAt: number }
interface Thing22 { id: string; name: string; score22: number }
interface Raw22 { data: Thing22[]; fetchedAt: number }
interface Thing23 { id: string; name: string; score23: number }
interface Raw23 { data: Thing23[]; fetchedAt: number }
interface Thing24 { id: string; name: string; score24: number }
interface Raw24 { data: Thing24[]; fetchedAt: number }
interface Thing25 { id: string; name: string; score25: number }
interface Raw25 { data: Thing25[]; fetchedAt: number }
interface Thing26 { id: string; name: string; score26: number }
interface Raw26 { data: Thing26[]; fetchedAt: number }
interface Thing27 { id: string; name: string; score27: number }
interface Raw27 { data: Thing27[]; fetchedAt: number }
interface Thing28 { id: string; name: string; score28: number }
interface Raw28 { data: Thing28[]; fetchedAt: number }
interface Thing29 { id: string; name: string; score29: number }
interface Raw29 { data: Thing29[]; fetchedAt: number }
interface Thing30 { id: string; name: string; score30: number }
interface Raw30 { data: Thing30[]; fetchedAt: number }
interface Thing31 { id: string; name: string; score31: number }
interface Raw31 { data: Thing31[]; fetchedAt: number }
interface Thing32 { id: string; name: string; score32: number }
interface Raw32 { data: Thing32[]; fetchedAt: number }
interface Thing33 { id: string; name: string; score33: number }
interface Raw33 { data: Thing33[]; fetchedAt: number }
interface Thing34 { id: string; name: string; score34: number }
interface Raw34 { data: Thing34[]; fetchedAt: number }
interface Thing35 { id: string; name: string; score35: number }
interface Raw35 { data: Thing35[]; fetchedAt: number }
interface Thing36 { id: string; name: string; score36: number }
interface Raw36 { data: Thing36[]; fetchedAt: number }
interface Thing37 { id: string; name: string; score37: number }
interface Raw37 { data: Thing37[]; fetchedAt: number }
interface Thing38 { id: string; name: string; score38: number }
interface Raw38 { data: Thing38[]; fetchedAt: number }
interface Thing39 { id: string; name: string; score39: number }
interface Raw39 { data: Thing39[]; fetchedAt: number }
interface Thing40 { id: string; name: string; score40: number }
interface Raw40 { data: Thing40[]; fetchedAt: number }
interface Thing41 { id: string; name: string; score41: number }
interface Raw41 { data: Thing41[]; fetchedAt: number }
interface Thing42 { id: string; name: string; score42: number }
interface Raw42 { data: Thing42[]; fetchedAt: number }
interface Thing43 { id: string; name: string; score43: number }
interface Raw43 { data: Thing43[]; fetchedAt: number }
interface Thing44 { id: string; name: string; score44: number }
interface Raw44 { data: Thing44[]; fetchedAt: number }
interface Thing45 { id: string; name: string; score45: number }
interface Raw45 { data: Thing45[]; fetchedAt: number }
interface Thing46 { id: string; name: string; score46: number }
interface Raw46 { data: Thing46[]; fetchedAt: number }
interface Thing47 { id: string; name: string; score47: number }
interface Raw47 { data: Thing47[]; fetchedAt: number }
interface Thing48 { id: string; name: string; score48: number }
interface Raw48 { data: Thing48[]; fetchedAt: number }
interface Thing49 { id: string; name: string; score49: number }
interface Raw49 { data: Thing49[]; fetchedAt: number }
interface Thing50 { id: string; name: string; score50: number }
interface Raw50 { data: Thing50[]; fetchedAt: number }
interface Thing51 { id: string; name: string; score51: number }
interface Raw51 { data: Thing51[]; fetchedAt: number }
interface Thing52 { id: string; name: string; score52: number }
interface Raw52 { data: Thing52[]; fetchedAt: number }
interface Thing53 { id: string; name: string; score53: number }
interface Raw53 { data: Thing53[]; fetchedAt: number }
interface Thing54 { id: string; name: string; score54: number }
interface Raw54 { data: Thing54[]; fetchedAt: number }
interface Thing55 { id: string; name: string; score55: number }
interface Raw55 { data: Thing55[]; fetchedAt: number }
interface Thing56 { id: string; name: string; score56: number }
interface Raw56 { data: Thing56[]; fetchedAt: number }
interface Thing57 { id: string; name: string; score57: number }
interface Raw57 { data: Thing57[]; fetchedAt: number }
interface Thing58 { id: string; name: string; score58: number }
interface Raw58 { data: Thing58[]; fetchedAt: number }
interface Thing59 { id: string; name: string; score59: number }
interface Raw59 { data: Thing59[]; fetchedAt: number }
interface Thing60 { id: string; name: string; score60: number }
interface Raw60 { data: Thing60[]; fetchedAt: number }
interface Thing61 { id: string; name: string; score61: number }
interface Raw61 { data: Thing61[]; fetchedAt: number }
interface Thing62 { id: string; name: string; score62: number }
interface Raw62 { data: Thing62[]; fetchedAt: number }
interface Thing63 { id: string; name: string; score63: number }
interface Raw63 { data: Thing63[]; fetchedAt: number }
interface Thing64 { id: string; name: string; score64: number }
interface Raw64 { data: Thing64[]; fetchedAt: number }
interface Thing65 { id: string; name: string; score65: number }
interface Raw65 { data: Thing65[]; fetchedAt: number }
interface Thing66 { id: string; name: string; score66: number }
interface Raw66 { data: Thing66[]; fetchedAt: number }

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['TagA', 'TagB', 'TagC', 'TagD', 'TagE'] as const,
  reducerPath: 'scaleApi',
  endpoints: (build) => ({
    getThing0: build.query<Thing0, string>({
      request: (id) => `/thing0/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing0List: {
      kind: build.query<Thing0[], void, Raw0>({
        request: () => '/thing0',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing0[]) =>
        things.map((t) => ({
          endpoint: 'getThing0' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing0: build.mutation<Thing0, Partial<Thing0> & { id: string }>({
      request: (patch) => ({ url: `/thing0/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing1: build.query<Thing1, string>({
      request: (id) => `/thing1/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing1List: {
      kind: build.query<Thing1[], void, Raw1>({
        request: () => '/thing1',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing1[]) =>
        things.map((t) => ({
          endpoint: 'getThing1' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing1: build.mutation<Thing1, Partial<Thing1> & { id: string }>({
      request: (patch) => ({ url: `/thing1/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing2: build.query<Thing2, string>({
      request: (id) => `/thing2/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing2List: {
      kind: build.query<Thing2[], void, Raw2>({
        request: () => '/thing2',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing2[]) =>
        things.map((t) => ({
          endpoint: 'getThing2' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing2: build.mutation<Thing2, Partial<Thing2> & { id: string }>({
      request: (patch) => ({ url: `/thing2/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing3: build.query<Thing3, string>({
      request: (id) => `/thing3/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing3List: {
      kind: build.query<Thing3[], void, Raw3>({
        request: () => '/thing3',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing3[]) =>
        things.map((t) => ({
          endpoint: 'getThing3' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing3: build.mutation<Thing3, Partial<Thing3> & { id: string }>({
      request: (patch) => ({ url: `/thing3/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing4: build.query<Thing4, string>({
      request: (id) => `/thing4/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing4List: {
      kind: build.query<Thing4[], void, Raw4>({
        request: () => '/thing4',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing4[]) =>
        things.map((t) => ({
          endpoint: 'getThing4' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing4: build.mutation<Thing4, Partial<Thing4> & { id: string }>({
      request: (patch) => ({ url: `/thing4/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing5: build.query<Thing5, string>({
      request: (id) => `/thing5/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing5List: {
      kind: build.query<Thing5[], void, Raw5>({
        request: () => '/thing5',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing5[]) =>
        things.map((t) => ({
          endpoint: 'getThing5' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing5: build.mutation<Thing5, Partial<Thing5> & { id: string }>({
      request: (patch) => ({ url: `/thing5/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing6: build.query<Thing6, string>({
      request: (id) => `/thing6/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing6List: {
      kind: build.query<Thing6[], void, Raw6>({
        request: () => '/thing6',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing6[]) =>
        things.map((t) => ({
          endpoint: 'getThing6' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing6: build.mutation<Thing6, Partial<Thing6> & { id: string }>({
      request: (patch) => ({ url: `/thing6/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing7: build.query<Thing7, string>({
      request: (id) => `/thing7/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing7List: {
      kind: build.query<Thing7[], void, Raw7>({
        request: () => '/thing7',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing7[]) =>
        things.map((t) => ({
          endpoint: 'getThing7' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing7: build.mutation<Thing7, Partial<Thing7> & { id: string }>({
      request: (patch) => ({ url: `/thing7/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing8: build.query<Thing8, string>({
      request: (id) => `/thing8/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing8List: {
      kind: build.query<Thing8[], void, Raw8>({
        request: () => '/thing8',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing8[]) =>
        things.map((t) => ({
          endpoint: 'getThing8' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing8: build.mutation<Thing8, Partial<Thing8> & { id: string }>({
      request: (patch) => ({ url: `/thing8/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing9: build.query<Thing9, string>({
      request: (id) => `/thing9/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing9List: {
      kind: build.query<Thing9[], void, Raw9>({
        request: () => '/thing9',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing9[]) =>
        things.map((t) => ({
          endpoint: 'getThing9' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing9: build.mutation<Thing9, Partial<Thing9> & { id: string }>({
      request: (patch) => ({ url: `/thing9/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing10: build.query<Thing10, string>({
      request: (id) => `/thing10/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing10List: {
      kind: build.query<Thing10[], void, Raw10>({
        request: () => '/thing10',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing10[]) =>
        things.map((t) => ({
          endpoint: 'getThing10' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing10: build.mutation<Thing10, Partial<Thing10> & { id: string }>({
      request: (patch) => ({ url: `/thing10/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing11: build.query<Thing11, string>({
      request: (id) => `/thing11/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing11List: {
      kind: build.query<Thing11[], void, Raw11>({
        request: () => '/thing11',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing11[]) =>
        things.map((t) => ({
          endpoint: 'getThing11' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing11: build.mutation<Thing11, Partial<Thing11> & { id: string }>({
      request: (patch) => ({ url: `/thing11/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing12: build.query<Thing12, string>({
      request: (id) => `/thing12/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing12List: {
      kind: build.query<Thing12[], void, Raw12>({
        request: () => '/thing12',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing12[]) =>
        things.map((t) => ({
          endpoint: 'getThing12' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing12: build.mutation<Thing12, Partial<Thing12> & { id: string }>({
      request: (patch) => ({ url: `/thing12/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing13: build.query<Thing13, string>({
      request: (id) => `/thing13/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing13List: {
      kind: build.query<Thing13[], void, Raw13>({
        request: () => '/thing13',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing13[]) =>
        things.map((t) => ({
          endpoint: 'getThing13' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing13: build.mutation<Thing13, Partial<Thing13> & { id: string }>({
      request: (patch) => ({ url: `/thing13/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing14: build.query<Thing14, string>({
      request: (id) => `/thing14/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing14List: {
      kind: build.query<Thing14[], void, Raw14>({
        request: () => '/thing14',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing14[]) =>
        things.map((t) => ({
          endpoint: 'getThing14' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing14: build.mutation<Thing14, Partial<Thing14> & { id: string }>({
      request: (patch) => ({ url: `/thing14/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing15: build.query<Thing15, string>({
      request: (id) => `/thing15/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing15List: {
      kind: build.query<Thing15[], void, Raw15>({
        request: () => '/thing15',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing15[]) =>
        things.map((t) => ({
          endpoint: 'getThing15' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing15: build.mutation<Thing15, Partial<Thing15> & { id: string }>({
      request: (patch) => ({ url: `/thing15/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing16: build.query<Thing16, string>({
      request: (id) => `/thing16/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing16List: {
      kind: build.query<Thing16[], void, Raw16>({
        request: () => '/thing16',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing16[]) =>
        things.map((t) => ({
          endpoint: 'getThing16' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing16: build.mutation<Thing16, Partial<Thing16> & { id: string }>({
      request: (patch) => ({ url: `/thing16/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing17: build.query<Thing17, string>({
      request: (id) => `/thing17/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing17List: {
      kind: build.query<Thing17[], void, Raw17>({
        request: () => '/thing17',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing17[]) =>
        things.map((t) => ({
          endpoint: 'getThing17' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing17: build.mutation<Thing17, Partial<Thing17> & { id: string }>({
      request: (patch) => ({ url: `/thing17/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing18: build.query<Thing18, string>({
      request: (id) => `/thing18/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing18List: {
      kind: build.query<Thing18[], void, Raw18>({
        request: () => '/thing18',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing18[]) =>
        things.map((t) => ({
          endpoint: 'getThing18' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing18: build.mutation<Thing18, Partial<Thing18> & { id: string }>({
      request: (patch) => ({ url: `/thing18/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing19: build.query<Thing19, string>({
      request: (id) => `/thing19/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing19List: {
      kind: build.query<Thing19[], void, Raw19>({
        request: () => '/thing19',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing19[]) =>
        things.map((t) => ({
          endpoint: 'getThing19' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing19: build.mutation<Thing19, Partial<Thing19> & { id: string }>({
      request: (patch) => ({ url: `/thing19/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing20: build.query<Thing20, string>({
      request: (id) => `/thing20/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing20List: {
      kind: build.query<Thing20[], void, Raw20>({
        request: () => '/thing20',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing20[]) =>
        things.map((t) => ({
          endpoint: 'getThing20' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing20: build.mutation<Thing20, Partial<Thing20> & { id: string }>({
      request: (patch) => ({ url: `/thing20/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing21: build.query<Thing21, string>({
      request: (id) => `/thing21/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing21List: {
      kind: build.query<Thing21[], void, Raw21>({
        request: () => '/thing21',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing21[]) =>
        things.map((t) => ({
          endpoint: 'getThing21' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing21: build.mutation<Thing21, Partial<Thing21> & { id: string }>({
      request: (patch) => ({ url: `/thing21/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing22: build.query<Thing22, string>({
      request: (id) => `/thing22/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing22List: {
      kind: build.query<Thing22[], void, Raw22>({
        request: () => '/thing22',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing22[]) =>
        things.map((t) => ({
          endpoint: 'getThing22' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing22: build.mutation<Thing22, Partial<Thing22> & { id: string }>({
      request: (patch) => ({ url: `/thing22/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing23: build.query<Thing23, string>({
      request: (id) => `/thing23/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing23List: {
      kind: build.query<Thing23[], void, Raw23>({
        request: () => '/thing23',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing23[]) =>
        things.map((t) => ({
          endpoint: 'getThing23' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing23: build.mutation<Thing23, Partial<Thing23> & { id: string }>({
      request: (patch) => ({ url: `/thing23/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing24: build.query<Thing24, string>({
      request: (id) => `/thing24/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing24List: {
      kind: build.query<Thing24[], void, Raw24>({
        request: () => '/thing24',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing24[]) =>
        things.map((t) => ({
          endpoint: 'getThing24' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing24: build.mutation<Thing24, Partial<Thing24> & { id: string }>({
      request: (patch) => ({ url: `/thing24/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing25: build.query<Thing25, string>({
      request: (id) => `/thing25/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing25List: {
      kind: build.query<Thing25[], void, Raw25>({
        request: () => '/thing25',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing25[]) =>
        things.map((t) => ({
          endpoint: 'getThing25' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing25: build.mutation<Thing25, Partial<Thing25> & { id: string }>({
      request: (patch) => ({ url: `/thing25/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing26: build.query<Thing26, string>({
      request: (id) => `/thing26/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing26List: {
      kind: build.query<Thing26[], void, Raw26>({
        request: () => '/thing26',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing26[]) =>
        things.map((t) => ({
          endpoint: 'getThing26' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing26: build.mutation<Thing26, Partial<Thing26> & { id: string }>({
      request: (patch) => ({ url: `/thing26/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing27: build.query<Thing27, string>({
      request: (id) => `/thing27/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing27List: {
      kind: build.query<Thing27[], void, Raw27>({
        request: () => '/thing27',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing27[]) =>
        things.map((t) => ({
          endpoint: 'getThing27' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing27: build.mutation<Thing27, Partial<Thing27> & { id: string }>({
      request: (patch) => ({ url: `/thing27/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing28: build.query<Thing28, string>({
      request: (id) => `/thing28/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing28List: {
      kind: build.query<Thing28[], void, Raw28>({
        request: () => '/thing28',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing28[]) =>
        things.map((t) => ({
          endpoint: 'getThing28' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing28: build.mutation<Thing28, Partial<Thing28> & { id: string }>({
      request: (patch) => ({ url: `/thing28/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing29: build.query<Thing29, string>({
      request: (id) => `/thing29/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing29List: {
      kind: build.query<Thing29[], void, Raw29>({
        request: () => '/thing29',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing29[]) =>
        things.map((t) => ({
          endpoint: 'getThing29' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing29: build.mutation<Thing29, Partial<Thing29> & { id: string }>({
      request: (patch) => ({ url: `/thing29/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing30: build.query<Thing30, string>({
      request: (id) => `/thing30/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing30List: {
      kind: build.query<Thing30[], void, Raw30>({
        request: () => '/thing30',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing30[]) =>
        things.map((t) => ({
          endpoint: 'getThing30' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing30: build.mutation<Thing30, Partial<Thing30> & { id: string }>({
      request: (patch) => ({ url: `/thing30/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing31: build.query<Thing31, string>({
      request: (id) => `/thing31/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing31List: {
      kind: build.query<Thing31[], void, Raw31>({
        request: () => '/thing31',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing31[]) =>
        things.map((t) => ({
          endpoint: 'getThing31' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing31: build.mutation<Thing31, Partial<Thing31> & { id: string }>({
      request: (patch) => ({ url: `/thing31/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing32: build.query<Thing32, string>({
      request: (id) => `/thing32/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing32List: {
      kind: build.query<Thing32[], void, Raw32>({
        request: () => '/thing32',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing32[]) =>
        things.map((t) => ({
          endpoint: 'getThing32' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing32: build.mutation<Thing32, Partial<Thing32> & { id: string }>({
      request: (patch) => ({ url: `/thing32/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing33: build.query<Thing33, string>({
      request: (id) => `/thing33/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing33List: {
      kind: build.query<Thing33[], void, Raw33>({
        request: () => '/thing33',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing33[]) =>
        things.map((t) => ({
          endpoint: 'getThing33' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing33: build.mutation<Thing33, Partial<Thing33> & { id: string }>({
      request: (patch) => ({ url: `/thing33/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing34: build.query<Thing34, string>({
      request: (id) => `/thing34/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing34List: {
      kind: build.query<Thing34[], void, Raw34>({
        request: () => '/thing34',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing34[]) =>
        things.map((t) => ({
          endpoint: 'getThing34' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing34: build.mutation<Thing34, Partial<Thing34> & { id: string }>({
      request: (patch) => ({ url: `/thing34/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing35: build.query<Thing35, string>({
      request: (id) => `/thing35/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing35List: {
      kind: build.query<Thing35[], void, Raw35>({
        request: () => '/thing35',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing35[]) =>
        things.map((t) => ({
          endpoint: 'getThing35' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing35: build.mutation<Thing35, Partial<Thing35> & { id: string }>({
      request: (patch) => ({ url: `/thing35/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing36: build.query<Thing36, string>({
      request: (id) => `/thing36/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing36List: {
      kind: build.query<Thing36[], void, Raw36>({
        request: () => '/thing36',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing36[]) =>
        things.map((t) => ({
          endpoint: 'getThing36' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing36: build.mutation<Thing36, Partial<Thing36> & { id: string }>({
      request: (patch) => ({ url: `/thing36/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing37: build.query<Thing37, string>({
      request: (id) => `/thing37/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing37List: {
      kind: build.query<Thing37[], void, Raw37>({
        request: () => '/thing37',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing37[]) =>
        things.map((t) => ({
          endpoint: 'getThing37' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing37: build.mutation<Thing37, Partial<Thing37> & { id: string }>({
      request: (patch) => ({ url: `/thing37/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing38: build.query<Thing38, string>({
      request: (id) => `/thing38/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing38List: {
      kind: build.query<Thing38[], void, Raw38>({
        request: () => '/thing38',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing38[]) =>
        things.map((t) => ({
          endpoint: 'getThing38' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing38: build.mutation<Thing38, Partial<Thing38> & { id: string }>({
      request: (patch) => ({ url: `/thing38/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing39: build.query<Thing39, string>({
      request: (id) => `/thing39/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing39List: {
      kind: build.query<Thing39[], void, Raw39>({
        request: () => '/thing39',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing39[]) =>
        things.map((t) => ({
          endpoint: 'getThing39' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing39: build.mutation<Thing39, Partial<Thing39> & { id: string }>({
      request: (patch) => ({ url: `/thing39/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing40: build.query<Thing40, string>({
      request: (id) => `/thing40/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing40List: {
      kind: build.query<Thing40[], void, Raw40>({
        request: () => '/thing40',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing40[]) =>
        things.map((t) => ({
          endpoint: 'getThing40' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing40: build.mutation<Thing40, Partial<Thing40> & { id: string }>({
      request: (patch) => ({ url: `/thing40/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing41: build.query<Thing41, string>({
      request: (id) => `/thing41/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing41List: {
      kind: build.query<Thing41[], void, Raw41>({
        request: () => '/thing41',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing41[]) =>
        things.map((t) => ({
          endpoint: 'getThing41' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing41: build.mutation<Thing41, Partial<Thing41> & { id: string }>({
      request: (patch) => ({ url: `/thing41/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing42: build.query<Thing42, string>({
      request: (id) => `/thing42/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing42List: {
      kind: build.query<Thing42[], void, Raw42>({
        request: () => '/thing42',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing42[]) =>
        things.map((t) => ({
          endpoint: 'getThing42' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing42: build.mutation<Thing42, Partial<Thing42> & { id: string }>({
      request: (patch) => ({ url: `/thing42/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing43: build.query<Thing43, string>({
      request: (id) => `/thing43/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing43List: {
      kind: build.query<Thing43[], void, Raw43>({
        request: () => '/thing43',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing43[]) =>
        things.map((t) => ({
          endpoint: 'getThing43' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing43: build.mutation<Thing43, Partial<Thing43> & { id: string }>({
      request: (patch) => ({ url: `/thing43/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing44: build.query<Thing44, string>({
      request: (id) => `/thing44/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing44List: {
      kind: build.query<Thing44[], void, Raw44>({
        request: () => '/thing44',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing44[]) =>
        things.map((t) => ({
          endpoint: 'getThing44' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing44: build.mutation<Thing44, Partial<Thing44> & { id: string }>({
      request: (patch) => ({ url: `/thing44/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing45: build.query<Thing45, string>({
      request: (id) => `/thing45/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing45List: {
      kind: build.query<Thing45[], void, Raw45>({
        request: () => '/thing45',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing45[]) =>
        things.map((t) => ({
          endpoint: 'getThing45' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing45: build.mutation<Thing45, Partial<Thing45> & { id: string }>({
      request: (patch) => ({ url: `/thing45/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing46: build.query<Thing46, string>({
      request: (id) => `/thing46/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing46List: {
      kind: build.query<Thing46[], void, Raw46>({
        request: () => '/thing46',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing46[]) =>
        things.map((t) => ({
          endpoint: 'getThing46' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing46: build.mutation<Thing46, Partial<Thing46> & { id: string }>({
      request: (patch) => ({ url: `/thing46/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing47: build.query<Thing47, string>({
      request: (id) => `/thing47/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing47List: {
      kind: build.query<Thing47[], void, Raw47>({
        request: () => '/thing47',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing47[]) =>
        things.map((t) => ({
          endpoint: 'getThing47' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing47: build.mutation<Thing47, Partial<Thing47> & { id: string }>({
      request: (patch) => ({ url: `/thing47/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing48: build.query<Thing48, string>({
      request: (id) => `/thing48/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing48List: {
      kind: build.query<Thing48[], void, Raw48>({
        request: () => '/thing48',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing48[]) =>
        things.map((t) => ({
          endpoint: 'getThing48' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing48: build.mutation<Thing48, Partial<Thing48> & { id: string }>({
      request: (patch) => ({ url: `/thing48/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing49: build.query<Thing49, string>({
      request: (id) => `/thing49/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing49List: {
      kind: build.query<Thing49[], void, Raw49>({
        request: () => '/thing49',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing49[]) =>
        things.map((t) => ({
          endpoint: 'getThing49' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing49: build.mutation<Thing49, Partial<Thing49> & { id: string }>({
      request: (patch) => ({ url: `/thing49/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing50: build.query<Thing50, string>({
      request: (id) => `/thing50/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing50List: {
      kind: build.query<Thing50[], void, Raw50>({
        request: () => '/thing50',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing50[]) =>
        things.map((t) => ({
          endpoint: 'getThing50' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing50: build.mutation<Thing50, Partial<Thing50> & { id: string }>({
      request: (patch) => ({ url: `/thing50/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing51: build.query<Thing51, string>({
      request: (id) => `/thing51/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing51List: {
      kind: build.query<Thing51[], void, Raw51>({
        request: () => '/thing51',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing51[]) =>
        things.map((t) => ({
          endpoint: 'getThing51' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing51: build.mutation<Thing51, Partial<Thing51> & { id: string }>({
      request: (patch) => ({ url: `/thing51/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing52: build.query<Thing52, string>({
      request: (id) => `/thing52/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing52List: {
      kind: build.query<Thing52[], void, Raw52>({
        request: () => '/thing52',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing52[]) =>
        things.map((t) => ({
          endpoint: 'getThing52' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing52: build.mutation<Thing52, Partial<Thing52> & { id: string }>({
      request: (patch) => ({ url: `/thing52/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing53: build.query<Thing53, string>({
      request: (id) => `/thing53/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing53List: {
      kind: build.query<Thing53[], void, Raw53>({
        request: () => '/thing53',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing53[]) =>
        things.map((t) => ({
          endpoint: 'getThing53' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing53: build.mutation<Thing53, Partial<Thing53> & { id: string }>({
      request: (patch) => ({ url: `/thing53/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing54: build.query<Thing54, string>({
      request: (id) => `/thing54/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing54List: {
      kind: build.query<Thing54[], void, Raw54>({
        request: () => '/thing54',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing54[]) =>
        things.map((t) => ({
          endpoint: 'getThing54' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing54: build.mutation<Thing54, Partial<Thing54> & { id: string }>({
      request: (patch) => ({ url: `/thing54/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing55: build.query<Thing55, string>({
      request: (id) => `/thing55/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing55List: {
      kind: build.query<Thing55[], void, Raw55>({
        request: () => '/thing55',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing55[]) =>
        things.map((t) => ({
          endpoint: 'getThing55' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing55: build.mutation<Thing55, Partial<Thing55> & { id: string }>({
      request: (patch) => ({ url: `/thing55/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing56: build.query<Thing56, string>({
      request: (id) => `/thing56/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing56List: {
      kind: build.query<Thing56[], void, Raw56>({
        request: () => '/thing56',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing56[]) =>
        things.map((t) => ({
          endpoint: 'getThing56' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing56: build.mutation<Thing56, Partial<Thing56> & { id: string }>({
      request: (patch) => ({ url: `/thing56/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing57: build.query<Thing57, string>({
      request: (id) => `/thing57/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing57List: {
      kind: build.query<Thing57[], void, Raw57>({
        request: () => '/thing57',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing57[]) =>
        things.map((t) => ({
          endpoint: 'getThing57' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing57: build.mutation<Thing57, Partial<Thing57> & { id: string }>({
      request: (patch) => ({ url: `/thing57/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing58: build.query<Thing58, string>({
      request: (id) => `/thing58/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing58List: {
      kind: build.query<Thing58[], void, Raw58>({
        request: () => '/thing58',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing58[]) =>
        things.map((t) => ({
          endpoint: 'getThing58' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing58: build.mutation<Thing58, Partial<Thing58> & { id: string }>({
      request: (patch) => ({ url: `/thing58/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing59: build.query<Thing59, string>({
      request: (id) => `/thing59/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing59List: {
      kind: build.query<Thing59[], void, Raw59>({
        request: () => '/thing59',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing59[]) =>
        things.map((t) => ({
          endpoint: 'getThing59' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing59: build.mutation<Thing59, Partial<Thing59> & { id: string }>({
      request: (patch) => ({ url: `/thing59/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing60: build.query<Thing60, string>({
      request: (id) => `/thing60/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing60List: {
      kind: build.query<Thing60[], void, Raw60>({
        request: () => '/thing60',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing60[]) =>
        things.map((t) => ({
          endpoint: 'getThing60' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing60: build.mutation<Thing60, Partial<Thing60> & { id: string }>({
      request: (patch) => ({ url: `/thing60/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing61: build.query<Thing61, string>({
      request: (id) => `/thing61/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing61List: {
      kind: build.query<Thing61[], void, Raw61>({
        request: () => '/thing61',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing61[]) =>
        things.map((t) => ({
          endpoint: 'getThing61' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing61: build.mutation<Thing61, Partial<Thing61> & { id: string }>({
      request: (patch) => ({ url: `/thing61/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing62: build.query<Thing62, string>({
      request: (id) => `/thing62/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing62List: {
      kind: build.query<Thing62[], void, Raw62>({
        request: () => '/thing62',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing62[]) =>
        things.map((t) => ({
          endpoint: 'getThing62' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing62: build.mutation<Thing62, Partial<Thing62> & { id: string }>({
      request: (patch) => ({ url: `/thing62/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing63: build.query<Thing63, string>({
      request: (id) => `/thing63/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing63List: {
      kind: build.query<Thing63[], void, Raw63>({
        request: () => '/thing63',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing63[]) =>
        things.map((t) => ({
          endpoint: 'getThing63' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing63: build.mutation<Thing63, Partial<Thing63> & { id: string }>({
      request: (patch) => ({ url: `/thing63/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing64: build.query<Thing64, string>({
      request: (id) => `/thing64/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing64List: {
      kind: build.query<Thing64[], void, Raw64>({
        request: () => '/thing64',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing64[]) =>
        things.map((t) => ({
          endpoint: 'getThing64' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing64: build.mutation<Thing64, Partial<Thing64> & { id: string }>({
      request: (patch) => ({ url: `/thing64/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing65: build.query<Thing65, string>({
      request: (id) => `/thing65/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing65List: {
      kind: build.query<Thing65[], void, Raw65>({
        request: () => '/thing65',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing65[]) =>
        things.map((t) => ({
          endpoint: 'getThing65' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing65: build.mutation<Thing65, Partial<Thing65> & { id: string }>({
      request: (patch) => ({ url: `/thing65/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
    getThing66: build.query<Thing66, string>({
      request: (id) => `/thing66/${id}`,
      providesTags: (result, error, id) => [{ type: 'TagA' as const, id }],
    }),
    getThing66List: {
      kind: build.query<Thing66[], void, Raw66>({
        request: () => '/thing66',
        transformResponse: (raw) => raw.data,
        providesTags: ['TagB'],
      }),
      upsert: (things: Thing66[]) =>
        things.map((t) => ({
          endpoint: 'getThing66' as const,
          arg: t.id,
          value: t,
        })),
    },
    updateThing66: build.mutation<Thing66, Partial<Thing66> & { id: string }>({
      request: (patch) => ({ url: `/thing66/${patch.id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, arg) => [{ type: 'TagA' as const, id: arg.id }, 'TagB'],
    }),
  }),
})

const useQ0 = api.useGetThing0Query
const useL0 = api.useGetThing0ListQuery
const useM0 = api.useUpdateThing0Mutation
const useQ1 = api.useGetThing1Query
const useL1 = api.useGetThing1ListQuery
const useM1 = api.useUpdateThing1Mutation
const useQ2 = api.useGetThing2Query
const useL2 = api.useGetThing2ListQuery
const useM2 = api.useUpdateThing2Mutation
const useQ3 = api.useGetThing3Query
const useL3 = api.useGetThing3ListQuery
const useM3 = api.useUpdateThing3Mutation
const useQ4 = api.useGetThing4Query
const useL4 = api.useGetThing4ListQuery
const useM4 = api.useUpdateThing4Mutation
const useQ5 = api.useGetThing5Query
const useL5 = api.useGetThing5ListQuery
const useM5 = api.useUpdateThing5Mutation
const useQ6 = api.useGetThing6Query
const useL6 = api.useGetThing6ListQuery
const useM6 = api.useUpdateThing6Mutation
const useQ7 = api.useGetThing7Query
const useL7 = api.useGetThing7ListQuery
const useM7 = api.useUpdateThing7Mutation
const useQ8 = api.useGetThing8Query
const useL8 = api.useGetThing8ListQuery
const useM8 = api.useUpdateThing8Mutation
const useQ9 = api.useGetThing9Query
const useL9 = api.useGetThing9ListQuery
const useM9 = api.useUpdateThing9Mutation
const useQ10 = api.useGetThing10Query
const useL10 = api.useGetThing10ListQuery
const useM10 = api.useUpdateThing10Mutation
const useQ11 = api.useGetThing11Query
const useL11 = api.useGetThing11ListQuery
const useM11 = api.useUpdateThing11Mutation
const useQ12 = api.useGetThing12Query
const useL12 = api.useGetThing12ListQuery
const useM12 = api.useUpdateThing12Mutation
const useQ13 = api.useGetThing13Query
const useL13 = api.useGetThing13ListQuery
const useM13 = api.useUpdateThing13Mutation
const useQ14 = api.useGetThing14Query
const useL14 = api.useGetThing14ListQuery
const useM14 = api.useUpdateThing14Mutation
const useQ15 = api.useGetThing15Query
const useL15 = api.useGetThing15ListQuery
const useM15 = api.useUpdateThing15Mutation
const useQ16 = api.useGetThing16Query
const useL16 = api.useGetThing16ListQuery
const useM16 = api.useUpdateThing16Mutation
const useQ17 = api.useGetThing17Query
const useL17 = api.useGetThing17ListQuery
const useM17 = api.useUpdateThing17Mutation
const useQ18 = api.useGetThing18Query
const useL18 = api.useGetThing18ListQuery
const useM18 = api.useUpdateThing18Mutation
const useQ19 = api.useGetThing19Query
const useL19 = api.useGetThing19ListQuery
const useM19 = api.useUpdateThing19Mutation
const useQ20 = api.useGetThing20Query
const useL20 = api.useGetThing20ListQuery
const useM20 = api.useUpdateThing20Mutation
const useQ21 = api.useGetThing21Query
const useL21 = api.useGetThing21ListQuery
const useM21 = api.useUpdateThing21Mutation
const useQ22 = api.useGetThing22Query
const useL22 = api.useGetThing22ListQuery
const useM22 = api.useUpdateThing22Mutation
const useQ23 = api.useGetThing23Query
const useL23 = api.useGetThing23ListQuery
const useM23 = api.useUpdateThing23Mutation
const useQ24 = api.useGetThing24Query
const useL24 = api.useGetThing24ListQuery
const useM24 = api.useUpdateThing24Mutation
const useQ25 = api.useGetThing25Query
const useL25 = api.useGetThing25ListQuery
const useM25 = api.useUpdateThing25Mutation
const useQ26 = api.useGetThing26Query
const useL26 = api.useGetThing26ListQuery
const useM26 = api.useUpdateThing26Mutation
const useQ27 = api.useGetThing27Query
const useL27 = api.useGetThing27ListQuery
const useM27 = api.useUpdateThing27Mutation
const useQ28 = api.useGetThing28Query
const useL28 = api.useGetThing28ListQuery
const useM28 = api.useUpdateThing28Mutation
const useQ29 = api.useGetThing29Query
const useL29 = api.useGetThing29ListQuery
const useM29 = api.useUpdateThing29Mutation
const useQ30 = api.useGetThing30Query
const useL30 = api.useGetThing30ListQuery
const useM30 = api.useUpdateThing30Mutation
const useQ31 = api.useGetThing31Query
const useL31 = api.useGetThing31ListQuery
const useM31 = api.useUpdateThing31Mutation
const useQ32 = api.useGetThing32Query
const useL32 = api.useGetThing32ListQuery
const useM32 = api.useUpdateThing32Mutation
const useQ33 = api.useGetThing33Query
const useL33 = api.useGetThing33ListQuery
const useM33 = api.useUpdateThing33Mutation
const useQ34 = api.useGetThing34Query
const useL34 = api.useGetThing34ListQuery
const useM34 = api.useUpdateThing34Mutation
const useQ35 = api.useGetThing35Query
const useL35 = api.useGetThing35ListQuery
const useM35 = api.useUpdateThing35Mutation
const useQ36 = api.useGetThing36Query
const useL36 = api.useGetThing36ListQuery
const useM36 = api.useUpdateThing36Mutation
const useQ37 = api.useGetThing37Query
const useL37 = api.useGetThing37ListQuery
const useM37 = api.useUpdateThing37Mutation
const useQ38 = api.useGetThing38Query
const useL38 = api.useGetThing38ListQuery
const useM38 = api.useUpdateThing38Mutation
const useQ39 = api.useGetThing39Query
const useL39 = api.useGetThing39ListQuery
const useM39 = api.useUpdateThing39Mutation
const useQ40 = api.useGetThing40Query
const useL40 = api.useGetThing40ListQuery
const useM40 = api.useUpdateThing40Mutation
const useQ41 = api.useGetThing41Query
const useL41 = api.useGetThing41ListQuery
const useM41 = api.useUpdateThing41Mutation
const useQ42 = api.useGetThing42Query
const useL42 = api.useGetThing42ListQuery
const useM42 = api.useUpdateThing42Mutation
const useQ43 = api.useGetThing43Query
const useL43 = api.useGetThing43ListQuery
const useM43 = api.useUpdateThing43Mutation
const useQ44 = api.useGetThing44Query
const useL44 = api.useGetThing44ListQuery
const useM44 = api.useUpdateThing44Mutation
const useQ45 = api.useGetThing45Query
const useL45 = api.useGetThing45ListQuery
const useM45 = api.useUpdateThing45Mutation
const useQ46 = api.useGetThing46Query
const useL46 = api.useGetThing46ListQuery
const useM46 = api.useUpdateThing46Mutation
const useQ47 = api.useGetThing47Query
const useL47 = api.useGetThing47ListQuery
const useM47 = api.useUpdateThing47Mutation
const useQ48 = api.useGetThing48Query
const useL48 = api.useGetThing48ListQuery
const useM48 = api.useUpdateThing48Mutation
const useQ49 = api.useGetThing49Query
const useL49 = api.useGetThing49ListQuery
const useM49 = api.useUpdateThing49Mutation
const useQ50 = api.useGetThing50Query
const useL50 = api.useGetThing50ListQuery
const useM50 = api.useUpdateThing50Mutation
const useQ51 = api.useGetThing51Query
const useL51 = api.useGetThing51ListQuery
const useM51 = api.useUpdateThing51Mutation
const useQ52 = api.useGetThing52Query
const useL52 = api.useGetThing52ListQuery
const useM52 = api.useUpdateThing52Mutation
const useQ53 = api.useGetThing53Query
const useL53 = api.useGetThing53ListQuery
const useM53 = api.useUpdateThing53Mutation
const useQ54 = api.useGetThing54Query
const useL54 = api.useGetThing54ListQuery
const useM54 = api.useUpdateThing54Mutation
const useQ55 = api.useGetThing55Query
const useL55 = api.useGetThing55ListQuery
const useM55 = api.useUpdateThing55Mutation
const useQ56 = api.useGetThing56Query
const useL56 = api.useGetThing56ListQuery
const useM56 = api.useUpdateThing56Mutation
const useQ57 = api.useGetThing57Query
const useL57 = api.useGetThing57ListQuery
const useM57 = api.useUpdateThing57Mutation
const useQ58 = api.useGetThing58Query
const useL58 = api.useGetThing58ListQuery
const useM58 = api.useUpdateThing58Mutation
const useQ59 = api.useGetThing59Query
const useL59 = api.useGetThing59ListQuery
const useM59 = api.useUpdateThing59Mutation
const useQ60 = api.useGetThing60Query
const useL60 = api.useGetThing60ListQuery
const useM60 = api.useUpdateThing60Mutation
const useQ61 = api.useGetThing61Query
const useL61 = api.useGetThing61ListQuery
const useM61 = api.useUpdateThing61Mutation
const useQ62 = api.useGetThing62Query
const useL62 = api.useGetThing62ListQuery
const useM62 = api.useUpdateThing62Mutation
const useQ63 = api.useGetThing63Query
const useL63 = api.useGetThing63ListQuery
const useM63 = api.useUpdateThing63Mutation
const useQ64 = api.useGetThing64Query
const useL64 = api.useGetThing64ListQuery
const useM64 = api.useUpdateThing64Mutation
const useQ65 = api.useGetThing65Query
const useL65 = api.useGetThing65ListQuery
const useM65 = api.useUpdateThing65Mutation
const useQ66 = api.useGetThing66Query
const useL66 = api.useGetThing66ListQuery
const useM66 = api.useUpdateThing66Mutation

export { api }
