import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface TimeResponse {
  time: string
}

export const timeApi = createApi({
  reducerPath: 'timeApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: ['Time'],
  endpoints: (build) => ({
    getTime: build.query<TimeResponse, string>({
      query: (id) => `time/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Time', id }],
    }),
  }),
})

export const { usePrefetch: usePrefetchTime, useGetTimeQuery } = timeApi
