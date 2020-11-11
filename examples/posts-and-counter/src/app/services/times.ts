import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

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
      provides: (result, id) => [{ type: 'Time', id }],
    }),
  }),
});
