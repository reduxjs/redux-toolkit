import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '../src';

test('handles a non-async baseQuery without error', async () => {
  const baseQuery = (args?: any) => args;
  const api = createApi({
    baseQuery,
    endpoints: (build) => ({
      getUser: build.query<unknown, number>({
        query(id) {
          return { url: `user/${id}` };
        },
      }),
    }),
  });
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (gDM) => gDM().concat(api.middleware),
  });

  const promise = store.dispatch(api.actions.getUser(1));
  const { data } = await promise;

  expect(data).toEqual({
    url: 'user/1',
  });

  const storeResult = api.selectors.getUser(1)(store.getState());
  expect(storeResult).toEqual({
    data: {
      url: 'user/1',
    },
    endpoint: 'getUser',
    internalQueryArgs: {
      url: 'user/1',
    },
    originalArgs: 1,
    requestId: expect.any(String),
    status: 'fulfilled',
  });
});
