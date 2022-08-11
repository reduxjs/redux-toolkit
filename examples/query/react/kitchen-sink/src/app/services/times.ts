import { api } from './api'

interface TimeResponse {
  time: string
}

export const timeApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTime: build.query<TimeResponse, string>({
      query: (id) => `time/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Time', id }],
    }),
  }),
})

export const { usePrefetch: usePrefetchTime, useGetTimeQuery } = timeApi
