import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'

interface TimeResponse {
  time: string
}

export const timeApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  reducerPath: 'timeApi',
  tagTypes: ['Time'],
  endpoints: (build) => ({
    getTime: build.query<TimeResponse, string>({
      query: (id) => `time/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Time', id }],
    }),
  }),
})
