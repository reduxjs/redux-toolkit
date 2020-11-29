import { SerializedError } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@rtk-incubator/rtk-query';
import { expectExactType, expectType } from './helpers';

const api = createApi({
  baseQuery: fetchBaseQuery(),
  endpoints: (build) => ({
    test: build.query<string, void>({ query: () => '' }),
  }),
});

describe.skip('TS only tests', () => {
  test('query selector union', () => {
    const result = api.endpoints.test.select()({} as any);

    if (result.isUninitialized) {
      expectExactType(undefined)(result.data);
      expectExactType(undefined)(result.error);

      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isError);
      expectExactType(false as false)(result.isSuccess);
    }
    if (result.isLoading) {
      expectExactType('' as string | undefined)(result.data);
      expectExactType(undefined as SerializedError | FetchBaseQueryError | undefined)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isError);
      expectExactType(false as false)(result.isSuccess);
    }
    if (result.isError) {
      expectExactType('' as string | undefined)(result.data);
      expectExactType({} as SerializedError | FetchBaseQueryError)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isSuccess);
    }
    if (result.isSuccess) {
      expectExactType('' as string)(result.data);
      expectExactType(undefined)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isError);
    }

    // @ts-expect-error
    expectType<never>(result);
    // is always one of those four
    if (!result.isUninitialized && !result.isLoading && !result.isError && !result.isSuccess) {
      expectType<never>(result);
    }
  });
  test('queryHookResult union', () => {
    const result = api.useTestQuery();

    if (result.isUninitialized) {
      expectExactType(undefined)(result.data);
      expectExactType(undefined)(result.error);

      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isError);
      expectExactType(false as false)(result.isSuccess);
      expectExactType(false as false)(result.isFetching);
    }
    if (result.isLoading) {
      expectExactType(undefined)(result.data);
      expectExactType(undefined as SerializedError | FetchBaseQueryError | undefined)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isError);
      expectExactType(false as false)(result.isSuccess);
      expectExactType(false as boolean)(result.isFetching);
    }
    if (result.isError) {
      expectExactType('' as string | undefined)(result.data);
      expectExactType({} as SerializedError | FetchBaseQueryError)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isSuccess);
      expectExactType(false as false)(result.isFetching);
    }
    if (result.isSuccess) {
      expectExactType('' as string)(result.data);
      expectExactType(undefined)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as false)(result.isLoading);
      expectExactType(false as false)(result.isError);
      expectExactType(false as boolean)(result.isFetching);
    }
    if (result.isFetching) {
      expectExactType('' as string | undefined)(result.data);
      expectExactType(undefined as SerializedError | FetchBaseQueryError | undefined)(result.error);

      expectExactType(false as false)(result.isUninitialized);
      expectExactType(false as boolean)(result.isLoading);
      expectExactType(false as boolean)(result.isSuccess);
      expectExactType(false as false)(result.isError);
    }

    // @ts-expect-error
    expectType<never>(result);
    // is always one of those four
    if (!result.isUninitialized && !result.isLoading && !result.isError && !result.isSuccess) {
      expectType<never>(result);
    }
  });
});
