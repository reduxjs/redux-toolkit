import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

interface CountResponse {
  count: number;
}

export const counterApi = createApi({
  reducerPath: 'counterApi',
  baseQuery: fetchBaseQuery(),
  entityTypes: ['Counter'],
  endpoints: (build) => ({
    getCount: build.query<CountResponse, void>({
      query() {
        return {
          queryString: `count`,
        };
      },
      provides: [{ type: 'Counter' }], 
    }),
    incrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          queryString: `increment`,
          method: 'PUT',
          body: JSON.stringify({ amount }),
        };
      },
      invalidates: [{ type: 'Counter' }],
    }),
    decrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          queryString: `decrement`,
          method: 'PUT',
          body: JSON.stringify({ amount }),
        };
      },
      invalidates: [{ type: 'Counter' }],
    }),
  }),
});
