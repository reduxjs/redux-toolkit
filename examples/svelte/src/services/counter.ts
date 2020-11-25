import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

interface CountResponse {
    count: number;
}

export const counterApi = createApi({
    reducerPath: 'counterApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/',
    }),
    entityTypes: ['Counter'],
    endpoints: (build) => ({
        getCount: build.query<CountResponse, void>({
            query: () => ({
                url: `count`,
            }),
            provides: ['Counter'],
        }),
        incrementCount: build.mutation<CountResponse, number>({
            query: (amount) => ({
                url: `increment`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: ['Counter'],
        }),
        decrementCount: build.mutation<CountResponse, number>({
            query: (amount) => ({
                url: `decrement`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: ['Counter'],
        }),
        getCountById: build.query<CountResponse, string>({
            query: (id: string) => `${id}`,
            provides: (_, id) => [{ type: 'Counter', id }],
        }),
        incrementCountById: build.mutation<CountResponse, { id: string; amount: number }>({
            query: ({ id, amount }) => ({
                url: `${id}/increment`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: (_, { id }) => [{ type: 'Counter', id }],
        }),
        decrementCountById: build.mutation<CountResponse, { id: string; amount: number }>({
            query: ({ id, amount }) => ({
                url: `${id}/decrement`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: (_, { id }) => [{ type: 'Counter', id }],
        }),
        stop: build.mutation<any, void>({
            query: () => ({
                url: 'stop',
                method: 'PUT',
            }),
        }),
    }),
});
