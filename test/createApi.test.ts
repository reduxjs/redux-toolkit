import { configureStore } from '@reduxjs/toolkit';
import { Api, createApi, fetchBaseQuery } from '../src';
import { ANY, expectType } from './helpers';

test('sensible defaults', () => {
  const api = createApi({
    baseQuery: fetchBaseQuery(),
    endpoints: (build) => ({
      getUser: build.query<unknown, string>({
        query(id) {
          return { url: `user/${id}` };
        },
      }),
    }),
  });
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (gDM) => gDM().concat(api.middleware),
  });
  expect(api.reducerPath).toBe('api');

  expectType<'api'>(api.reducerPath);
  type EntityTypes = typeof api extends Api<any, any, any, infer E> ? E : 'no match';
  expectType<EntityTypes>(ANY as never);
  // @ts-expect-error
  expectType<EntityTypes>(0);
});
