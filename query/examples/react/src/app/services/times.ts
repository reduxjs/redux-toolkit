import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query/react';

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
      provides: (result, error, id) => [{ type: 'Time', id }],
    }),
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 10,
});

export const { usePrefetch: usePrefetchTime, useGetTimeQuery } = timeApi;
