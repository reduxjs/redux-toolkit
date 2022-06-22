import { api } from './api'

interface CountResponse {
  count: number
}

export const counterApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCount: build.query<CountResponse, void>({
      query: () => 'count',
      providesTags: ['Counter'],
    }),
    incrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `increment`,
          method: 'PUT',
          body: { amount },
        }
      },
      invalidatesTags: ['Counter'],
    }),
    decrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `decrement`,
          method: 'PUT',
          body: { amount },
        }
      },
      invalidatesTags: ['Counter'],
    }),
  }),
})

export const {
  useDecrementCountMutation,
  useGetCountQuery,
  useIncrementCountMutation,
} = counterApi
