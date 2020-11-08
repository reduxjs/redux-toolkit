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
            query: () => 'count',
            provides: ['Counter'],
        }),
        getCountById: build.query<CountResponse, number>({
            query: (id: number) => `${id}`,
            provides: (_, id) => [{ type: 'Counter', id }],
        }),
        incrementCount: build.mutation<CountResponse, number>({
            query(amount) {
                return {
                    url: `increment`,
                    method: 'PUT',
                    body: JSON.stringify({ amount }),
                };
            },
            invalidates: ['Counter'],
        }),
        incrementCountById: build.mutation<CountResponse, { id: number; amount: number }>({
            query({ id, amount }) {
                return {
                    url: `${id}/increment`,
                    method: 'PUT',
                    body: JSON.stringify({ amount }),
                };
            },
            invalidates: (_, { id }) => [{ type: 'Counter', id }],
        }),
        decrementCount: build.mutation<CountResponse, number>({
            query(amount) {
                return {
                    url: `decrement`,
                    method: 'PUT',
                    body: JSON.stringify({ amount }),
                };
            },
            invalidates: ['Counter'],
        }),
        decrementCountById: build.mutation<CountResponse, { id: number; amount: number }>({
            query({ id, amount }) {
                return {
                    url: `${id}/decrement`,
                    method: 'PUT',
                    body: JSON.stringify({ amount }),
                };
            },
            invalidates: (_, { id }) => [{ type: 'Counter', id }],
        }),
    }),
});
