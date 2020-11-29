import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

interface TimeResponse {
  time: string;
}

export const timeApi = createApi({
  reducerPath: 'timeApi',
  baseQuery: fetchBaseQuery(),
  entityTypes: ['Time'],
  endpoints: (build) => ({
    getTime: build.query<TimeResponse, string>({
      query: (id) => `time/${id}`,
      provides: (_, id) => [{ type: 'Time', id }],
    }),
  }),
});

export const { usePrefetch: usePrefetchTime, useGetTimeQuery } = timeApi;
